# Changelog

All notable changes to this project will be documented in this file.

## 26.10.1

- Added optional `map_color` to customize the popup map marker and history trail color
- Added a Map color text field to the visual editor, independent of Custom Colors and history settings
- Leave the setting empty to keep Home Assistant's default map color

## 26.07.1

- Fixed popup maps opening without visible person markers or history paths after recent Home Assistant frontend changes
- Keep the popup attached inside the card render tree so Home Assistant's native map card retains the dashboard context it needs
- Let the native map card handle entity location availability instead of blocking map creation with a GPS-attribute pre-check
- Removed the legacy `track` map option from the popup map configuration

## v1.0.0

- Initial public GitHub release
- HACS custom repository support via `hacs.json`
- HACS validation workflow
- Expanded README with setup, configuration, and usage examples
