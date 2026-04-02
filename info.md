# Modular Person Card

Dashboard card for Home Assistant that displays `person` and `device_tracker` entities with:

- avatar or entity picture
- smart home, away, unknown, and zone badges
- optional 3/4 ring tracker
- popup details with related rows
- live or history map support
- custom rule-based icon and color overrides

![Modular Person Card preview](assets/preview.png)

## HACS

Add this repository to HACS as a custom repository with category `Dashboard`:

`https://github.com/Rhaenon/modular-person-card`

If the Lovelace resource is not added automatically, use:

```yaml
- url: /hacsfiles/modular-person-card/modular-person-card.js
  type: module
```
