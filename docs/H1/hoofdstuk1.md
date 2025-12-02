# Hoofdstuk 1 – Eerste Python-code

## Oefening 1 – Standaard editor

Hier kan de leerling vrij experimenteren.

{% include "editor.html" %}

---

## Oefening 2 – som(a, b)

Schrijf een functie `som(a, b)` die de som van twee getallen teruggeeft.

De tests controleren o.a.:

- `som(1, 2)` → `3`
- `som(5, 7)` → `12`
- `som(-1, 1)` → `0`

{% set code %}
def som(a, b): # Schrijf hier je code
return 0
{% endset %}

{% set tests %}
[
["som(1, 2)", 3],
["som(5, 7)", 12],
["som(-1, 1)", 0]
]
{% endset %}

{% include "exercise.html" %}
