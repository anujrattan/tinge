# Color profiles audit

## Import file

Use [`color_profiles_import.csv`](./color_profiles_import.csv) for Supabase / Postgres import into `color_profiles` (file in repo).

- Columns: `name`, `hex` (matches table constraints; unique on both)
- 30 rows — covers **regular tee**, **oversized tee**, and all current DB profiles
- `Red` uses provider hex `#CE051F` (regular + oversized HTML); DB had `#ce0511`

### Supabase import

Table: `color_profiles` with `on conflict (name) do update set hex = excluded.hex, updated_at = now()`.

Save the block below as `color_profiles_import.csv` (or import via SQL using the same values):

```csv
name,hex
Almond,#F8F0C6
Ash Grey,#C9C9C9
Beige,#E9D3C0
Black,#202020
Brick Red,#EE4432
Burgundy,#3A131F
Butter Yellow,#FFFBA8
Charcoal Grey,#3E3433
Chocolate Brown,#895129
Coffee Brown,#693617
Forest Green,#4E6745
Golden Yellow,#FFB300
Iris Lavender,#BAA3DA
Ivory,#FFFFF0
Light Pink,#FFCFE7
Liril Green,#7BDE4E
Maroon,#650C17
Melange Grey,#AFAFAF
Mustard Yellow,#EB9B54
Navy Blue,#062646
Olive Green,#193D24
Orange,#FF5E00
Pastel Dusty,#DCA1A1
Purple,#3F246A
Red,#CE051F
Royal Blue,#101C86
Silver Frost,#A0A5A9
Sky Blue,#1BCEFA
Smoke Blue,#4D608C
Surf Blue,#9DD6E1
White,#FFFFFF
```

## Duplicates

No duplicate **names** or **hex** values in the import sheet.

## Near-duplicates (keep unless you merge manually)

| Notes |
|-------|
| `Ash Grey`, `Melange Grey`, `Silver Frost` — three distinct greys |
| `Red`, `Brick Red`, `Maroon`, `Burgundy` — distinct reds |
| `Coffee Brown`, `Chocolate Brown`, `Beige` — distinct browns |
| `Ivory` vs `White` — different hexes |

## Provider palettes

- **Regular tee:** 17 colors — subset of this import file
- **Oversized tee:** ~27 colors — subset of this import file

Product-type filtering in admin UI is **out of scope**.
