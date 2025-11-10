#!/usr/bin/env python3
"""Resolve tooltip placeholders using Community Dragon data."""
from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.request import urlopen

BASE_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = BASE_DIR / "data" / "cdragon_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BIN_URL = "https://raw.communitydragon.org/latest/game/data/characters/{alias}/{alias}.bin.json"

PLACEHOLDER_PATTERN = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")
TOKEN_PATTERN = re.compile(r"[A-Za-z_][A-Za-z0-9_.]*")

RESOURCE_TRANSLATIONS = {
    "en": {
        "Mana": "Mana",
        "Energy": "Energy",
        "Fury": "Fury",
        "Rage": "Rage",
        "Bloodthirst": "Bloodthirst",
        "Heat": "Heat",
        "Shield": "Shield",
        "Health": "Health",
        "No Cost": "No Cost",
        "None": "",
        "Flow": "Flow",
        "Grit": "Grit",
        "Ferocity": "Ferocity",
        "Courage": "Courage",
        "Rage Power": "Rage Power",
    },
    "ru": {
        "Mana": "Мана",
        "Energy": "Энергия",
        "Fury": "Ярость",
        "Rage": "Ярость",
        "Bloodthirst": "Жажда крови",
        "Heat": "Перегрев",
        "Shield": "Щит",
        "Health": "Здоровье",
        "No Cost": "Без затрат",
        "None": "",
        "Flow": "Поток",
        "Grit": "Настойчивость",
        "Ferocity": "Свирепость",
        "Courage": "Отвага",
        "Rage Power": "Сила гнева",
    },
}

SPECIAL_EMPTY = {
    "spellmodifierdescriptionappend",
    "spellmancost",
    "spelleffectfootnote",
}

SCALING_LABEL_HINTS = {
    "bonusad": "bonus AD",
    "totalad": "total AD",
    "ap": "AP",
    "armor": "Armor",
    "mr": "Magic Resist",
    "hp": "Health",
    "maxhp": "max Health",
    "missinghealth": "missing Health",
    "movespeed": "Move Speed",
    "attackspeed": "Attack Speed",
    "crit": "Critical Strike",
}


class LoadError(RuntimeError):
    """Raised when a JS payload cannot be parsed."""


class SkipPlaceholder(RuntimeError):
    """Raised when placeholder should be left unresolved."""


def debug(msg: str) -> None:
    print(msg)


def find_assignment(text: str, var_name: str) -> Tuple[str, int, int]:
    marker = f"window.{var_name}"
    idx = text.find(marker)
    if idx == -1:
        raise LoadError(f"Variable {var_name} not found")
    eq_idx = text.find("=", idx)
    if eq_idx == -1:
        raise LoadError(f"Assignment for {var_name} not found")
    json_str, start, end = extract_json_block(text, eq_idx)
    return json_str, start, end


def extract_json_block(text: str, start_idx: int) -> Tuple[str, int, int]:
    brace_start = text.find("{", start_idx)
    if brace_start == -1:
        raise LoadError("Opening brace not found")
    depth = 0
    in_string = False
    escape = False
    for pos in range(brace_start, len(text)):
        ch = text[pos]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[brace_start:pos + 1], brace_start, pos + 1
    raise LoadError("JSON block not terminated")


def load_js_object(path: Path, var_name: str) -> Tuple[Dict[str, object], str]:
    text = path.read_text(encoding="utf-8")
    payload, start, end = find_assignment(text, var_name)
    data = json.loads(payload)
    return data, text


def dump_js_object(path: Path, var_name: str, data: Dict[str, object], original_text: str) -> None:
    payload, start, end = find_assignment(original_text, var_name)
    new_payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    new_text = original_text[:start] + new_payload + original_text[end:]
    path.write_text(new_text, encoding="utf-8")


def fetch_bin(alias: str) -> Dict[str, object]:
    cache_file = CACHE_DIR / f"{alias}.bin.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    url = BIN_URL.format(alias=alias)
    with urlopen(url) as resp:  # noqa: S310
        data = resp.read().decode("utf-8")
    cache_file.write_text(data, encoding="utf-8")
    return json.loads(data)


def normalize_alias(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def align_lists(a: List[float], b: List[float]) -> Tuple[List[float], List[float]]:
    length = max(len(a), len(b))

    def expand(values: List[float]) -> List[float]:
        if not values:
            return [0.0] * length
        if len(values) == length:
            return values
        if len(values) == 1:
            return [values[0]] * length
        return values + [values[-1]] * (length - len(values))

    return expand(a), expand(b)


def list_to_slash(values: List[float]) -> str:
    if not values:
        return "0"
    formatted = [format_number(v) for v in values]
    if all(x == formatted[0] for x in formatted):
        return formatted[0]
    return "/".join(formatted)


def format_number(value: float) -> str:
    if abs(value - round(value)) < 1e-6:
        return str(int(round(value)))
    return f"{value:.3f}".rstrip("0").rstrip(".")


@dataclass
class Value:
    terms: Dict[str, List[float]] = field(default_factory=dict)

    @classmethod
    def from_numbers(cls, numbers: Iterable[float]) -> "Value":
        return cls({"": [float(x) for x in numbers]})

    @classmethod
    def from_scalar(cls, number: float) -> "Value":
        return cls({"": [float(number)]})

    @classmethod
    def from_scaling(cls, coeffs: Iterable[float], label: str) -> "Value":
        return cls({label: [float(x) for x in coeffs]})

    def copy(self) -> "Value":
        return Value({k: v[:] for k, v in self.terms.items()})

    def ensure_length(self, length: int) -> None:
        for key, values in list(self.terms.items()):
            if not values:
                self.terms[key] = [0.0] * length
            elif len(values) == length:
                continue
            elif len(values) == 1:
                self.terms[key] = [values[0]] * length
            else:
                self.terms[key] = values + [values[-1]] * (length - len(values))

    def merge(self, other: "Value") -> "Value":
        out = self.copy()
        for desc, coeffs in other.terms.items():
            if desc in out.terms:
                a, b = align_lists(out.terms[desc], coeffs)
                out.terms[desc] = [x + y for x, y in zip(a, b)]
            else:
                out.terms[desc] = coeffs[:]
        return out

    def add(self, other: "Value") -> "Value":
        return self.merge(other)

    def sub(self, other: "Value") -> "Value":
        neg = {k: [-x for x in v] for k, v in other.terms.items()}
        return self.merge(Value(neg))

    def mul(self, other: "Value") -> "Value":
        if other.is_scalar():
            scalar = other.get_scalar()
            return Value({k: [x * scalar for x in v] for k, v in self.terms.items()})
        if self.is_scalar():
            scalar = self.get_scalar()
            return Value({k: [x * scalar for x in v] for k, v in other.terms.items()})
        raise ValueError("Multiplication of non-scalar values is not supported")

    def truediv(self, other: "Value") -> "Value":
        if other.is_scalar():
            scalar = other.get_scalar()
            return Value({k: [x / scalar for x in v] for k, v in self.terms.items()})
        raise ValueError("Division by non-scalar values is not supported")

    def neg(self) -> "Value":
        return Value({k: [-x for x in v] for k, v in self.terms.items()})

    def is_scalar(self) -> bool:
        if len(self.terms) != 1:
            return False
        coeffs = next(iter(self.terms.values()))
        return len(coeffs) == 1

    def get_scalar(self) -> float:
        if not self.is_scalar():
            raise ValueError("Value is not scalar")
        return next(iter(self.terms.values()))[0]

    def length(self) -> int:
        length = 0
        for values in self.terms.values():
            length = max(length, len(values))
        return length or 1

    def to_string(self) -> str:
        length = self.length()
        self.ensure_length(length)
        base = self.terms.get("", [0.0] * length)
        result = list_to_slash(base)
        extras: List[str] = []
        for desc, coeffs in self.terms.items():
            if not desc:
                continue
            if all(abs(x) < 1e-8 for x in coeffs):
                continue
            formatted = list_to_slash(coeffs)
            sign = "" if formatted.startswith("-") else "+"
            extras.append(f"({sign}{formatted} {desc})")
        if extras:
            result = f"{result} {' '.join(extras)}".strip()
        return result.strip()


class PlaceholderEvaluator(ast.NodeVisitor):
    def __init__(self, resolver: "AbilityResolver", name_map: Dict[str, str]):
        self.resolver = resolver
        self.name_map = name_map

    def visit_Name(self, node: ast.Name) -> Value:
        original = self.name_map.get(node.id, node.id)
        return self.resolver.get_value(original)

    def visit_Constant(self, node: ast.Constant) -> Value:
        if isinstance(node.value, (int, float)):
            return Value.from_scalar(float(node.value))
        raise ValueError("Unsupported constant type")

    def visit_UnaryOp(self, node: ast.UnaryOp) -> Value:
        operand = self.visit(node.operand)
        if isinstance(node.op, ast.USub):
            return operand.neg()
        if isinstance(node.op, ast.UAdd):
            return operand
        raise ValueError("Unsupported unary operator")

    def visit_BinOp(self, node: ast.BinOp) -> Value:
        left = self.visit(node.left)
        right = self.visit(node.right)
        if isinstance(node.op, ast.Add):
            return left.add(right)
        if isinstance(node.op, ast.Sub):
            return left.sub(right)
        if isinstance(node.op, ast.Mult):
            return left.mul(right)
        if isinstance(node.op, ast.Div):
            return left.truediv(right)
        raise ValueError("Unsupported binary operator")

    def generic_visit(self, node):  # noqa: D401
        raise ValueError(f"Unsupported expression: {ast.dump(node)}")


class AbilityResolver:
    def __init__(self, champion: "ChampionResolver", name: str, meta_spell: Optional[Dict[str, object]], spell_data: Dict[str, object]):
        self.champion = champion
        self.name = name
        self.meta_spell = meta_spell or {}
        self.spell_data = spell_data or {}
        self.effect = self.meta_spell.get("effect") or []
        self.effect_burn = self.meta_spell.get("effectBurn") or []
        self.cooldown = [float(x) for x in self.meta_spell.get("cooldown") or []]
        self.cost = [float(x) for x in self.meta_spell.get("cost") or []]
        self.range = [float(x) for x in self.meta_spell.get("range") or []]
        self.data_values: Dict[str, List[float]] = {}
        self.calculations: Dict[str, Dict[str, object]] = {}
        self._load_spell()

    def _load_spell(self) -> None:
        spell = self.spell_data.get("mSpell") or self.spell_data
        data_values = spell.get("DataValues") or []
        for entry in data_values:
            name = str(entry.get("mName", ""))
            values = [float(x) for x in entry.get("mValues") or []]
            if not name:
                continue
            self.data_values[name.lower()] = values
        calculations = spell.get("mSpellCalculations") or {}
        for key, value in calculations.items():
            self.calculations[key.lower()] = value

    def get_value(self, name: str) -> Value:
        name = name.strip()
        name_lower = name.lower()

        if name_lower in SPECIAL_EMPTY:
            return Value.from_scalar(0.0)

        effect_match = re.match(r"(?:e|effect)(\d+)(?:amount)?(nl)?", name_lower)
        if effect_match:
            index = int(effect_match.group(1))
            values = self._get_effect_values(index)
            if effect_match.group(2):
                values = shift_next(values)
            return Value.from_numbers(values)

        if name_lower == "cooldown":
            return Value.from_numbers(self.cooldown)
        if name_lower == "cooldownnl":
            return Value.from_numbers(shift_next(self.cooldown))
        if name_lower == "cost":
            return Value.from_numbers(self.cost)
        if name_lower == "costnl":
            return Value.from_numbers(shift_next(self.cost))
        if name_lower == "range":
            return Value.from_numbers(self.range)
        if name_lower == "rangenl":
            return Value.from_numbers(shift_next(self.range))

        if name_lower in self.data_values:
            return Value.from_numbers(self.data_values[name_lower])

        camel = to_camel_case(name_lower)
        if camel.lower() in self.data_values:
            return Value.from_numbers(self.data_values[camel.lower()])

        if name_lower in self.calculations:
            return self._evaluate_calculation(self.calculations[name_lower])
        if camel.lower() in self.calculations:
            return self._evaluate_calculation(self.calculations[camel.lower()])

        stats = self.champion.stats
        if camel in stats:
            return Value.from_numbers([float(stats[camel])])

        raise KeyError(f"Unknown placeholder '{name}' for ability {self.name}")

    def _evaluate_calculation(self, calc: Dict[str, object]) -> Value:
        parts = calc.get("mFormulaParts") or []
        result = Value.from_scalar(0.0)
        for part in parts:
            part_type = part.get("__type")
            if part_type == "NamedDataValueCalculationPart":
                value = self.get_value(part.get("mDataValue", ""))
            elif part_type == "StatByNamedDataValueCalculationPart":
                coeffs = self.get_value(part.get("mDataValue", ""))
                base_coeffs = coeffs.terms.get("", [0.0])
                label = scaling_label(part.get("mDataValue", ""))
                value = Value.from_scaling(base_coeffs, label)
            elif part_type == "NumberCalculationPart":
                value = Value.from_scalar(float(part.get("mNumber", 0.0)))
            elif part_type == "ProductOfSubPartsCalculationPart":
                left = self._evaluate_calculation(part.get("mPart1", {}))
                right = self._evaluate_calculation(part.get("mPart2", {}))
                value = left.mul(right)
            elif part_type == "SumOfSubPartsCalculationPart":
                subtotal = Value.from_scalar(0.0)
                for sub in part.get("mSubparts", []) or []:
                    subtotal = subtotal.add(self._evaluate_calculation(sub))
                value = subtotal
            else:
                raise ValueError(f"Unsupported calculation part '{part_type}'")
            result = result.add(value)
        return result

    def _get_effect_values(self, index: int) -> List[float]:
        if index < len(self.effect):
            raw = self.effect[index]
            if isinstance(raw, list):
                return [float(x) for x in raw]
        if index < len(self.effect_burn):
            raw = self.effect_burn[index]
            if isinstance(raw, str):
                parts = [p for p in raw.split("/") if p]
                if parts:
                    return [float(p) for p in parts]
        return []


class ChampionResolver:
    def __init__(self, name: str, meta: Dict[str, object], bin_data: Dict[str, object], en_entry: Dict[str, object]):
        self.name = name
        self.meta = meta
        self.bin_data = bin_data
        self.en_entry = en_entry
        self.stats = {to_camel_case(k): v for k, v in (meta.get("stats") or {}).items()}
        self.alias = normalize_alias(meta.get("id", name))
        self.abilities: Dict[str, AbilityResolver] = {}
        self._prepare_abilities()

    def _prepare_abilities(self) -> None:
        spells = self.meta.get("spells") or []
        letters = ["q", "w", "e", "r"]
        for idx, spell_meta in enumerate(spells):
            spell_id = spell_meta.get("id")
            ability_data = self._resolve_spell(spell_id)
            if not ability_data:
                continue
            resolver = AbilityResolver(self, spell_id, spell_meta, ability_data)
            keys = {
                spell_id.lower(),
                normalize_alias(spell_id),
            }
            if idx < len(letters):
                keys.add(letters[idx])
                keys.add(f"{self.alias}{letters[idx]}")
            for key in keys:
                self.abilities[key] = resolver
        passive_key = f"{self.meta.get('id')}Passive"
        passive_data = self._resolve_spell(passive_key)
        if passive_data:
            resolver = AbilityResolver(self, "passive", None, passive_data)
            for key in {"passive", normalize_alias(passive_key)}:
                self.abilities[key] = resolver

    def _resolve_spell(self, script_name: Optional[str]) -> Optional[Dict[str, object]]:
        if not script_name:
            return None
        target = script_name.lower()
        for key, value in self.bin_data.items():
            if not isinstance(value, dict):
                continue
            if key.lower().endswith(f"/{target}"):
                return value
        return None

    def resolve_locale(self, locale: str, entry: Dict[str, object], stats: Optional[Dict[str, object]]) -> None:
        spells = entry.get("spells")
        if isinstance(spells, list):
            for idx, spell in enumerate(spells):
                ability = self._ability_by_index(idx)
                spells[idx] = replace_placeholders(spell, locale, self, ability, stats)
        if "passive" in entry:
            ability = self.abilities.get("passive")
            if ability:
                entry["passive"] = replace_placeholders(entry["passive"], locale, self, ability, stats)
        for key, value in list(entry.items()):
            if key in {"spells", "passive"}:
                continue
            entry[key] = replace_placeholders(value, locale, self, None, stats)

    def _ability_by_index(self, idx: int) -> Optional[AbilityResolver]:
        spells = self.meta.get("spells") or []
        if idx < len(spells):
            spell_id = spells[idx].get("id") or ""
            for key in (spell_id.lower(), normalize_alias(spell_id)):
                if key in self.abilities:
                    return self.abilities[key]
        letters = ["q", "w", "e", "r"]
        if idx < len(letters):
            key = letters[idx]
            if key in self.abilities:
                return self.abilities[key]
        return None

    def ability_resource(self, locale: str) -> str:
        base = self.en_entry.get("partype", "")
        translated = RESOURCE_TRANSLATIONS.get(locale, {}).get(base)
        if translated is None:
            return RESOURCE_TRANSLATIONS["en"].get(base, base)
        return translated


def shift_next(values: List[float]) -> List[float]:
    if not values:
        return []
    return [values[i + 1] if i + 1 < len(values) else values[-1] for i in range(len(values))]


def to_camel_case(name: str) -> str:
    parts = re.split(r"[^a-z0-9]+", name)
    return "".join(part.capitalize() for part in parts if part)


def scaling_label(data_value_name: str) -> str:
    name = data_value_name.lower()
    for key, label in SCALING_LABEL_HINTS.items():
        if key in name:
            return label
    return to_camel_case(data_value_name).lower()


def preprocess_expression(expr: str) -> Tuple[str, Dict[str, str]]:
    name_map: Dict[str, str] = {}
    processed = expr
    for token in set(TOKEN_PATTERN.findall(expr)):
        if token.replace(".", "", 1).isdigit():
            continue
        if ":" in token:
            continue
        replacement = token.replace(".", "_")
        if replacement != token:
            processed = processed.replace(token, replacement)
            name_map[replacement] = token
    return processed, name_map


def count_names(node: ast.AST) -> int:
    if isinstance(node, ast.Name):
        return 1
    if isinstance(node, ast.Constant):
        return 0
    if isinstance(node, ast.UnaryOp):
        return count_names(node.operand)
    if isinstance(node, ast.BinOp):
        return count_names(node.left) + count_names(node.right)
    return 0


def is_simple_expression(node: ast.AST) -> bool:
    if isinstance(node, ast.Name):
        return True
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return True
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        return is_simple_expression(node.operand)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Mult, ast.Div)):
        return is_simple_expression(node.left) and is_simple_expression(node.right)
    return False


def replace_placeholders(obj, locale: str, champion: ChampionResolver, ability: Optional[AbilityResolver], stats: Optional[Dict[str, object]] = None):
    if isinstance(obj, dict):
        return {k: replace_placeholders(v, locale, champion, ability, stats) for k, v in obj.items()}
    if isinstance(obj, list):
        return [replace_placeholders(v, locale, champion, ability, stats) for v in obj]
    if isinstance(obj, str):
        def repl(match: re.Match[str]) -> str:
            name = match.group(1).strip()
            try:
                if name.lower() == "abilityresourcename":
                    return champion.ability_resource(locale)
                if ability is None:
                    if stats is not None:
                        stats["skipped"] = stats.get("skipped", 0) + 1
                    return match.group(0)
                result = resolve_placeholder(name, locale, champion, ability)
                if stats is not None:
                    stats["replaced"] = stats.get("replaced", 0) + 1
                return result
            except SkipPlaceholder:
                if stats is not None:
                    stats["skipped"] = stats.get("skipped", 0) + 1
                return match.group(0)
            except Exception as err:  # noqa: BLE001
                debug(f"[{champion.name}] unresolved placeholder '{name}' in ability {ability.name if ability else 'global'}: {err}")
                if stats is not None:
                    stats.setdefault("errors", []).append((champion.name, ability.name if ability else "global", name, str(err)))
                    stats["skipped"] = stats.get("skipped", 0) + 1
                return match.group(0)
        return PLACEHOLDER_PATTERN.sub(repl, obj)
    return obj


def resolve_placeholder(name: str, locale: str, champion: ChampionResolver, ability: AbilityResolver) -> str:
    if name.lower().startswith("spell."):
        target, value = name.split(":", 1)
        raw = target.split(".", 1)[1]
        lookup_keys = {
            to_camel_case(raw).lower(),
            normalize_alias(raw),
            raw.lower(),
        }
        other = None
        for key in lookup_keys:
            other = champion.abilities.get(key)
            if other:
                break
        if not other:
            raise KeyError(f"Unknown spell reference '{raw}'")
        return resolve_placeholder(value, locale, champion, other)

    processed, name_map = preprocess_expression(name)
    tree = ast.parse(processed, mode="eval")
    if not is_simple_expression(tree.body) or count_names(tree.body) != 1:
        raise SkipPlaceholder("Expression requires complex calculation")
    evaluator = PlaceholderEvaluator(ability, name_map)
    value = evaluator.visit(tree.body)
    return value.to_string()


def main() -> None:
    meta, meta_text = load_js_object(BASE_DIR / "champion_meta.js", "LOL_CHAMPIONS_META")
    en_text, en_original = load_js_object(BASE_DIR / "champion_text_en.js", "LOL_CHAMPIONS_TEXT_EN")
    ru_text, ru_original = load_js_object(BASE_DIR / "champion_text_ru.js", "LOL_CHAMPIONS_TEXT_RU")

    champions: Dict[str, ChampionResolver] = {}
    for name, meta_entry in meta.items():
        alias = normalize_alias(meta_entry.get("id", name))
        try:
            bin_data = fetch_bin(alias)
        except Exception as err:  # noqa: BLE001
            debug(f"Failed to fetch bin for {name}: {err}")
            continue
        en_entry = en_text.get(name, {})
        champions[name] = ChampionResolver(name, meta_entry, bin_data, en_entry)

    stats: Dict[str, object] = {}
    for locale, data in (("en", en_text), ("ru", ru_text)):
        for name, champion in champions.items():
            entry = data.get(name)
            if isinstance(entry, dict):
                champion.resolve_locale(locale, entry, stats)

    dump_js_object(BASE_DIR / "champion_text_en.js", "LOL_CHAMPIONS_TEXT_EN", en_text, en_original)
    dump_js_object(BASE_DIR / "champion_text_ru.js", "LOL_CHAMPIONS_TEXT_RU", ru_text, ru_original)

    replaced = int(stats.get("replaced", 0))
    skipped = int(stats.get("skipped", 0))
    debug(f"Placeholders replaced: {replaced}")
    debug(f"Placeholders skipped : {skipped}")
    unresolved = stats.get("errors")
    if unresolved:
        debug(f"Unresolved placeholders logged: {len(unresolved)}")


if __name__ == "__main__":
    main()
