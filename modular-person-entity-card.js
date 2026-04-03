// src/modular-person-popup.js
var HaPanelLovelace = customElements.get("ha-panel-lovelace");
var HuiMasonryView = customElements.get("hui-masonry-view");
var LitElement = window.LitElement || (HaPanelLovelace ? Object.getPrototypeOf(HaPanelLovelace) : void 0) || (HuiMasonryView ? Object.getPrototypeOf(HuiMasonryView) : void 0);
if (!LitElement) {
  throw new Error("Modular Person Card popup could not find LitElement in Home Assistant.");
}
var html = LitElement.prototype.html;
var css = LitElement.prototype.css;
var ModularPersonPopup = class extends LitElement {
  static get properties() {
    return { hass: {}, config: {}, entityId: {} };
  }
  createRenderRoot() {
    return this;
  }
  render() {
    if (!this.hass || !this.entityId) return html``;
    const entity = this.hass.states?.[this.entityId];
    if (!entity) return html`<div>Entity not available: ${this.entityId}</div>`;
    return html`
      <style>
        ${this.constructor.styles.cssText}
      </style>
      <div class="overlay" @click=${this._close}>
        <div class="dialog" @click=${this._stopPropagation}>
          <div class="header">
            <div id="person-entity-row"></div>
            <div class="header-actions">
              <button
                class="icon-button"
                @click=${(ev) => this._openNativeMoreInfoView(ev, "history")}
                aria-label="Open history"
                title="History"
              >
                <ha-icon icon="mdi:chart-box-outline"></ha-icon>
              </button>
              <button
                class="icon-button"
                @click=${(ev) => this._openNativeMoreInfoView(ev, "settings")}
                aria-label="Open settings"
                title="Settings"
              >
                <ha-icon icon="mdi:cog-outline"></ha-icon>
              </button>
            </div>
            <button class="close-button" @click=${this._close} aria-label="Close">
              &times;
            </button>
          </div>

          <div class="content">
            <div id="proximity-entity-row"></div>
            <div id="ring-entity-rows"></div>
            <div id="custom-entity-rows"></div>
            <div id="map"></div>
          </div>
        </div>
      </div>
    `;
  }
  connectedCallback() {
    super.connectedCallback();
    this._scheduleInitializeCards();
  }
  updated(changedProps) {
    if (changedProps.has("hass") || changedProps.has("config") || changedProps.has("entityId")) {
      this._scheduleInitializeCards();
    }
  }
  async _initializeCards() {
    const $ = (id) => this.querySelector(`#${id}`);
    if (!this.hass || !this.entityId) return;
    const personContainer = $("person-entity-row");
    const proximityContainer = $("proximity-entity-row");
    const ringRowsContainer = $("ring-entity-rows");
    const customRowsContainer = $("custom-entity-rows");
    const mapContainer = $("map");
    if (!personContainer || !proximityContainer || !ringRowsContainer || !customRowsContainer || !mapContainer) {
      return;
    }
    [personContainer, proximityContainer, ringRowsContainer, customRowsContainer, mapContainer].forEach((el) => {
      el.innerHTML = "";
    });
    await this._loadHelpers();
    if (!this._cardHelpers) return;
    const personRow = this._createInteractiveRow(this.entityId);
    personContainer.appendChild(personRow);
    if (this.config?.proximity_entity) {
      const proxRow = this._createInteractiveRow(this.config.proximity_entity);
      proximityContainer.appendChild(proxRow);
    }
    if (this.config?.findPhoneScriptId) {
      const phoneRow = this._createInteractiveRow(this.config.findPhoneScriptId);
      proximityContainer.appendChild(phoneRow);
    }
    const ringEntityId = this.config?.ring_tracker_entity;
    const ringBooleanEntityId = this.config?.ring_boolean_entity;
    if (this.config?.ring_tracker_enabled && ringEntityId) {
      const ringTrackerRow = this._createInteractiveRow(ringEntityId);
      ringRowsContainer.appendChild(ringTrackerRow);
    }
    if (this.config?.ring_tracker_enabled && ringBooleanEntityId && ringBooleanEntityId !== ringEntityId) {
      const ringBooleanRow = this._createInteractiveRow(ringBooleanEntityId);
      ringRowsContainer.appendChild(ringBooleanRow);
    }
    const customStateRows = Array.isArray(this.config?.custom_states) ? this.config.custom_states : [];
    const excludedEntities = new Set([
      this.entityId,
      this.config?.proximity_entity,
      this.config?.findPhoneScriptId,
      ringEntityId,
      ringBooleanEntityId
    ].filter(Boolean));
    for (const rule of customStateRows) {
      if (!rule?.entity || excludedEntities.has(rule.entity)) continue;
      const customEntity = this.hass.states?.[rule.entity];
      if (!customEntity) continue;
      const customRow = this._createInteractiveRow(rule.entity);
      customRowsContainer.appendChild(customRow);
      excludedEntities.add(rule.entity);
    }
    const entity = this.hass.states?.[this.entityId];
    const hasGPS = entity?.attributes?.latitude != null && entity?.attributes?.longitude != null;
    if (!hasGPS) {
      mapContainer.innerHTML = `<div>Location data not available.</div>`;
      return;
    }
    const historyHours = this._getHistoryHours();
    const showHistory = this.config?.show_history !== false;
    const mapConfig = {
      type: "map",
      entities: [this.entityId],
      default_zoom: 15
    };
    if (showHistory) {
      mapConfig.hours_to_show = historyHours;
      mapConfig.track = true;
    }
    const mapCard = await this._createCardElement(mapConfig);
    if (mapCard) mapContainer.appendChild(mapCard);
  }
  _getHistoryHours() {
    const value = Number(this.config?.history_hours);
    return Number.isFinite(value) && value > 0 ? value : 24;
  }
  _scheduleInitializeCards() {
    if (this._initializeScheduled) return;
    this._initializeScheduled = true;
    requestAnimationFrame(async () => {
      this._initializeScheduled = false;
      await this._initializeCards();
    });
  }
  async _loadHelpers() {
    if (!this._cardHelpers && window.loadCardHelpers) {
      try {
        this._cardHelpers = await window.loadCardHelpers();
      } catch (e) {
        console.error("Card helpers failed to load", e);
      }
    }
  }
  async _createCardElement(config) {
    await this._loadHelpers();
    if (!this._cardHelpers?.createCardElement) return null;
    const el = await this._cardHelpers.createCardElement(config);
    el.hass = this.hass;
    if (el.tagName === "HUI-ERROR-CARD") {
      console.error("Card error:", el.config?.error);
      return null;
    }
    return el;
  }
  _createInteractiveRow(entityId) {
    const row = this._cardHelpers.createRowElement({ entity: entityId });
    row.hass = this.hass;
    row.style.cursor = "pointer";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    const activate = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._showMoreInfo(entityId);
    };
    if ("PointerEvent" in window) {
      row.addEventListener("pointerup", activate);
    } else {
      row.addEventListener("click", activate);
    }
    row.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        activate(ev);
      }
    });
    return row;
  }
  _showMoreInfo(entityId) {
    this._showMoreInfoView(entityId);
  }
  _openNativeMoreInfoView(ev, view) {
    ev.preventDefault();
    ev.stopPropagation();
    this._showMoreInfoView(this.entityId, view);
  }
  _showMoreInfoView(entityId, view = void 0) {
    this._close();
    requestAnimationFrame(() => {
      const event = new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        // HA's more-info dialog supports an optional view parameter on newer
        // frontends. Keep tab for older compatibility; if unsupported, HA
        // will still open the default more-info dialog for the entity.
        detail: view ? { entityId, view, tab: view } : { entityId }
      });
      const appRoot = document.querySelector("home-assistant") || document.querySelector("hc-main") || document.body;
      appRoot.dispatchEvent(event);
    });
  }
  _close() {
    this.parentNode?.removeChild(this);
  }
  _stopPropagation(e) {
    e.stopPropagation();
  }
  static get styles() {
    return css`
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .dialog {
        background: var(--card-background-color, #fff);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        max-width: 800px;
        width: 90%;
        max-height: 100%;
        overflow: auto;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 16px;
        border-bottom: 1px solid var(--divider-color);
      }

      .header > #person-entity-row {
        flex: 1;
        min-width: 0;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .icon-button,
      .close-button {
        background: none;
        border: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }

      .icon-button:hover,
      .icon-button:focus-visible,
      .close-button:hover,
      .close-button:focus-visible {
        background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.08);
        outline: none;
      }

      .icon-button ha-icon {
        --mdc-icon-size: 22px;
      }

      .close-button {
        font-size: 1.5em;
        line-height: 1;
        flex-shrink: 0;
      }

      .content {
        padding: 16px;
        flex: 1;
        overflow: auto;
      }
    `;
  }
};
customElements.define("modular-person-popup", ModularPersonPopup);

// src/modular-person-entity-card.js
var HaPanelLovelace2 = customElements.get("ha-panel-lovelace");
var HuiMasonryView2 = customElements.get("hui-masonry-view");
var LitElement2 = window.LitElement || (HaPanelLovelace2 ? Object.getPrototypeOf(HaPanelLovelace2) : void 0) || (HuiMasonryView2 ? Object.getPrototypeOf(HuiMasonryView2) : void 0);
if (!LitElement2) {
  throw new Error("Modular Person Card could not find LitElement in Home Assistant.");
}
var html2 = LitElement2.prototype.html;
var css2 = LitElement2.prototype.css;
var ModularPersonEntityCard = class extends LitElement2 {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }
  static get styles() {
    return css2`
      :host {
        display: flex;
        height: 100%;
        flex-grow: 1;
      }
      ha-card {
        padding: 1% 4%;
        font-family: Arial, sans-serif;
        background-color: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, white);
        display: flex;
        flex-direction: column;
        justify-content: var(--justify-content, center);
        align-items: center;
        min-height: 50px;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        height: 100%;
        flex-grow: 1;
      }
      .card-content {
        display: flex;
        flex-direction: var(--flex-direction, row);
        flex-wrap: wrap;
        row-gap: 5px;
        column-gap: 25px;
        align-items: center;
        justify-content: center;
        text-align: var(--text-align, left);
        width: 100%;
        padding: var(--padding, 10px 5px 5px 10px);
      }
      .entity-picture-container {
        position: relative;
        display: inline-block;
        text-align: center;
        line-height: 0;
      }
      .battery-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 62px;
        height: 62px;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      .battery-ring svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .battery-ring-track,
      .battery-ring-progress {
        fill: none;
        stroke-width: 4;
        stroke-linecap: round;
      }
      .battery-ring-track {
        stroke: rgba(255, 255, 255, 0.22);
      }
      .battery-ring-progress {
        stroke: var(--battery-ring-color, var(--primary-text-color, white));
        transition: stroke-dasharray 180ms ease, stroke 180ms ease;
      }
      .battery-ring-progress.charging {
        filter: drop-shadow(0 0 2px var(--battery-ring-color, var(--primary-text-color, white)));
      }
      .entity-picture {
        border-radius: 50%;
        width: 40px;
        height: 40px;
        border: solid 0.15em var(--icon-background-color);
        border-radius: 24px;
        display: block;
        position: relative;
        z-index: 1;
      }
      .state-icon {
        position: absolute;
        top: -8px;
        right: -12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--icon-background-color);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2;
      }
      .state-icon ha-icon {
        padding-right: 4px;
        padding-bottom: 4px;
        width: 20px;
        height: 20px;
        display: block;
      }
      .name-text {
        font-weight: bold;
        font-size: 1.06em;
        letter-spacing: 0.015em;
        text-align: center;
      }
      .state-text {
        font-size: 1em;
        color: gray;
        font-weight: bold;
        max-width: 100%;
        letter-spacing: 0.015em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .entity-text-container {
        display: flex;
        flex-direction: column;
        max-width: 100%;
      }
    `;
  }
  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = {
      custom_states: [],
      mirror_layout: false,
      show_history: config.show_history !== false,
      history_hours: 24,
      ring_tracker_enabled: Boolean(config.ring_tracker_enabled ?? config.ring_tracker_entity),
      ring_tracker_entity: "",
      ring_boolean_entity: "",
      ring_min: 0,
      ring_max: 100,
      custom_location_colors: Boolean(
        config.custom_location_colors ?? config.home_icon_background_color ?? config.away_icon_background_color ?? config.zone_icon_background_color ?? config.unknown_icon_background_color ?? config.ring_active_color
      ),
      home_icon_background_color: "rgb(137,179,248,0.85)",
      away_icon_background_color: "rgb(244,67,54,0.75)",
      zone_icon_background_color: "rgb(76, 175, 80, 0.75)",
      unknown_icon_background_color: "rgb(160,160,160,0.75)",
      ring_active_color: "rgb(76, 175, 80, 0.75)",
      ...config
    };
  }
  getCardSize() {
    return 1;
  }
  getLayoutOptions() {
    return {
      grid_rows: 2,
      grid_columns: 2,
      grid_min_rows: 2
    };
  }
  render() {
    if (!this.hass || !this.config) {
      return html2``;
    }
    const entity = this.hass.states[this.config.entity];
    if (!entity) {
      return html2`
        <ha-card>Entity not available: ${this.config.entity}</ha-card>
      `;
    }
    const name = this.config.name || entity.attributes.friendly_name;
    const stateIcon = this._getStateIcon(entity);
    const iconBackgroundColor = this._getStateIconBackgroundColor(entity);
    const ringEnabled = this.config.ring_tracker_enabled === true;
    const ringEntityId = ringEnabled ? this.config.ring_tracker_entity : "";
    const ringEntity = ringEntityId ? this.hass.states[ringEntityId] : null;
    const booleanEntityId = this.config.ring_boolean_entity;
    const chargingEntity = ringEnabled && booleanEntityId ? this.hass.states[booleanEntityId] : null;
    const ringIndicator = this._getRingIndicator(ringEntity, chargingEntity);
    const entityPicture = entity.attributes.entity_picture || "https://via.placeholder.com/40";
    const stateText = this._getStateDescription(entity);
    const showName = this.config.show_name !== false;
    const mirrorLayout = showName && this.config.mirror_layout === true;
    return html2`
      <ha-card
        @click="${this._showPopup}"
        style="
          --icon-background-color: ${iconBackgroundColor};
          --flex-direction: ${showName ? mirrorLayout ? "row-reverse" : "row" : "column"};
          --justify-content: ${showName ? "center" : "flex-start"};
          --column-gap: 5px;
          --text-align: ${showName ? "left" : "center"};
          --padding: ${showName ? "10px 5px 5px 5px" : "10px 5px 5px 5px"};
        "
        >
        <div class="card-content">
          <div class="entity-picture-container">
            ${ringIndicator ? html2`
              <div
                class="battery-ring"
                style="--battery-ring-color: ${ringIndicator.color};"
                aria-hidden="true"
              >
                <svg viewBox="0 0 62 62">
                  <circle
                    class="battery-ring-track"
                    cx="31"
                    cy="31"
                    r="25"
                    stroke-dasharray="${ringIndicator.trackDasharray}"
                    stroke-dashoffset="${ringIndicator.dashOffset}"
                  ></circle>
                  <circle
                    class="battery-ring-progress ${ringIndicator.isCharging ? "charging" : ""}"
                    cx="31"
                    cy="31"
                    r="25"
                    stroke-dasharray="${ringIndicator.progressDasharray}"
                    stroke-dashoffset="${ringIndicator.dashOffset}"
                  ></circle>
                </svg>
              </div>
            ` : ""}
            <img src="${entityPicture}" class="entity-picture" />
            <div class="state-icon">
              <ha-icon icon="${stateIcon}"></ha-icon>
            </div>
          </div>
          <div class="entity-text-container">
            ${showName ? html2`<div class="name-text">${name}</div>` : ""}
            <div class="state-text">${stateText}</div>
          </div>
        </div>
      </ha-card>
    `;
  }
  _getStateDescription(entity) {
    const state = entity.state;
    if (state === "home") return "Home";
    if (state === "unknown" || state === "unavailable") return "Unknown";
    if (state === "not_home") {
      const proximity = this.config.proximity_entity && this.hass.states[this.config.proximity_entity];
      const distance = proximity ? parseFloat(proximity.state) : NaN;
      if (!isNaN(distance)) {
        return distance < 1e3 ? `${Math.round(distance)}m` : `${(distance / 1e3).toFixed(distance / 1e3 < 1e3 ? 1 : 0)}km`;
      }
      return "Away";
    }
    const zone = this._getZoneEntity(state);
    if (zone && zone.attributes && zone.attributes.friendly_name) {
      return zone.attributes.friendly_name;
    }
    return state.charAt(0).toUpperCase() + state.slice(1);
  }
  _getStateIcon(entity) {
    const customRule = this._getMatchingCustomStateRule();
    if (customRule?.icon) return customRule.icon;
    const zone = this._getZoneEntity(entity.state);
    return zone?.attributes?.icon || this._defaultIcon(entity.state);
  }
  _getZoneEntity(state) {
    if (!state || !this.hass?.states) return null;
    const directZone = this.hass.states[`zone.${String(state).toLowerCase()}`];
    if (directZone) return directZone;
    const normalizedState = this._normalizeZoneKey(state);
    if (!normalizedState) return null;
    return Object.values(this.hass.states).find((entity) => {
      if (entity?.entity_id?.startsWith("zone.") !== true) return false;
      const entityId = entity.entity_id.slice("zone.".length);
      const friendlyName = entity.attributes?.friendly_name;
      return [
        entityId,
        friendlyName,
        entity.name,
        entity.state
      ].some((value) => this._normalizeZoneKey(value) === normalizedState);
    }) || null;
  }
  _normalizeZoneKey(value) {
    if (value == null) return "";
    return String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }
  _getMatchingCustomStateRule() {
    const rules = Array.isArray(this.config.custom_states) ? this.config.custom_states : [];
    for (const rule of rules) {
      if (!rule?.entity || !rule?.interactive_icon) continue;
      const ruleEntity = this.hass.states[rule.entity];
      if (!ruleEntity) continue;
      if (this._matchesRuleState(rule.state, ruleEntity.state)) {
        return rule;
      }
    }
    return null;
  }
  _matchesRuleState(ruleState, currentValue) {
    const normalizedRule = this._normalizeRuleState(ruleState);
    if (!normalizedRule) return false;
    if (this._matchesNumericExpression(normalizedRule, currentValue)) {
      return true;
    }
    const normalizedCurrent = this._normalizeRuleState(currentValue);
    return normalizedRule === normalizedCurrent;
  }
  _matchesNumericExpression(expression, currentValue) {
    if (typeof expression !== "string") return false;
    const numericValue = Number.parseFloat(currentValue);
    if (Number.isNaN(numericValue)) return false;
    const rangeMatch = expression.match(/^\s*(-?\d+(?:\.\d+)?)\s*\.\.\.\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (rangeMatch) {
      const start = Number.parseFloat(rangeMatch[1]);
      const end = Number.parseFloat(rangeMatch[2]);
      const lower = Math.min(start, end);
      const upper = Math.max(start, end);
      return numericValue >= lower && numericValue <= upper;
    }
    if (!/[<>!=]/.test(expression)) return false;
    const orGroups = expression.split("||").map((group) => group.trim()).filter(Boolean);
    if (orGroups.length === 0) return false;
    return orGroups.some((group) => {
      const clauses = group.split("&&").map((clause) => clause.trim()).filter(Boolean);
      if (clauses.length === 0) return false;
      return clauses.every((clause) => this._evaluateNumericClause(clause, numericValue));
    });
  }
  _evaluateNumericClause(clause, numericValue) {
    const match = clause.match(/^(<=|>=|!=|=|==|<|>)\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return false;
    const [, operator, rawExpected] = match;
    const expectedValue = Number.parseFloat(rawExpected);
    switch (operator) {
      case ">":
        return numericValue > expectedValue;
      case ">=":
        return numericValue >= expectedValue;
      case "<":
        return numericValue < expectedValue;
      case "<=":
        return numericValue <= expectedValue;
      case "!=":
        return numericValue !== expectedValue;
      case "=":
      case "==":
        return numericValue === expectedValue;
      default:
        return false;
    }
  }
  _normalizeRuleState(value) {
    if (typeof value === "boolean") return value ? "on" : "off";
    if (value == null) return "";
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") return "on";
    if (normalized === "false") return "off";
    return normalized;
  }
  _defaultIcon(state) {
    switch (state) {
      case "home":
        return "mdi:home";
      case "not_home":
        return "mdi:home-export-outline";
      case "unknown":
      case "unavailable":
        return "mdi:map-marker-question";
      default:
        return this.config.icon || "mdi:map-marker-radius";
    }
  }
  _getStateIconBackgroundColor(entity) {
    const customRule = this._getMatchingCustomStateRule();
    if (customRule?.color) return customRule.color;
    if (this.config.custom_location_colors === true) {
      const state2 = entity.state;
      switch (state2) {
        case "home":
          return this.config.home_icon_background_color;
        case "not_home":
          return this.config.away_icon_background_color;
        case "unknown":
        case "unavailable":
          return this.config.unknown_icon_background_color;
        default:
          return this.config.zone_icon_background_color;
      }
    }
    const state = entity.state;
    switch (state) {
      case "home":
        return "var(--home-icon-background-color, rgb(137,179,248,0.85))";
      case "not_home":
        return "var(--away-icon-background-color, rgb(244,67,54,0.75))";
      case "unknown":
      case "unavailable":
        return "var(--unknown-icon-background-color, rgb(160,160,160,0.75))";
      default:
        return "var(--zone-icon-background-color, rgb(76, 175, 80, 0.75))";
    }
  }
  _getRingIndicator(ringEntity, chargingEntity) {
    if (!ringEntity) return null;
    const valueCandidates = [
      Number.parseFloat(ringEntity.state),
      Number.parseFloat(ringEntity.attributes?.percentage),
      Number.parseFloat(ringEntity.attributes?.battery_level),
      Number.parseFloat(ringEntity.attributes?.value)
    ];
    const rawValue = valueCandidates.find((value) => !Number.isNaN(value));
    if (Number.isNaN(rawValue)) return null;
    const min = this._getNumericConfigValue(this.config.ring_min, 0);
    const max = this._getNumericConfigValue(this.config.ring_max, 100);
    const range = max - min;
    const normalizedLevel = range > 0 ? (rawValue - min) / range * 100 : rawValue;
    const level = Math.max(0, Math.min(100, normalizedLevel));
    const isCharging = this._isChargingEntity(chargingEntity) || ringEntity.state === "charging" || ringEntity.attributes?.charging === true || ringEntity.attributes?.battery_charging === true || String(ringEntity.attributes?.status || "").trim().toLowerCase() === "charging";
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    const visibleArc = circumference * 0.75;
    const gapArc = circumference - visibleArc;
    const progressArc = Math.max(0, visibleArc * (level / 100));
    const dashOffset = 0;
    let color = "var(--primary-text-color, white)";
    if (level <= 10) color = "rgba(244, 67, 54, 0.75)";
    else if (level <= 25) color = "#ff9800";
    else if (isCharging) {
      color = this.config.custom_location_colors === true ? this.config.ring_active_color : "var(--zone-icon-background-color, rgb(76, 175, 80, 0.75))";
    }
    return {
      color,
      isCharging,
      dashOffset,
      trackDasharray: `${visibleArc} ${gapArc}`,
      progressDasharray: `${progressArc} ${circumference}`
    };
  }
  _isChargingEntity(entity) {
    if (!entity) return false;
    const state = String(entity.state ?? "").trim().toLowerCase();
    return state === "on" || state === "charging" || state === "true" || entity.state === true || entity.attributes?.charging === true || entity.attributes?.battery_charging === true;
  }
  _getNumericConfigValue(value, fallback) {
    if (value === "" || value == null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  _showPopup() {
    const popup = document.createElement("modular-person-popup");
    popup.hass = this.hass;
    popup.config = this.config;
    popup.entityId = this.config.entity;
    document.body.appendChild(popup);
  }
  static getConfigElement() {
    return document.createElement("modular-person-entity-card-editor");
  }
  static getStubConfig(hass) {
    const personEntities = Object.keys(hass.states).filter((eid) => eid.startsWith("person."));
    const random = personEntities.length ? personEntities[Math.floor(Math.random() * personEntities.length)] : "person.fallback";
    const name = random.split(".")[1];
    return {
      entity: random,
      proximity_entity: `sensor.home_${name}_distance`,
      show_history: true,
      history_hours: 24,
      ring_tracker_enabled: false,
      ring_tracker_entity: "",
      ring_boolean_entity: "",
      ring_min: 0,
      ring_max: 100,
      custom_location_colors: false,
      home_icon_background_color: "rgb(137,179,248,0.85)",
      away_icon_background_color: "rgb(244,67,54,0.75)",
      zone_icon_background_color: "rgb(76, 175, 80, 0.75)",
      unknown_icon_background_color: "rgb(160,160,160,0.75)",
      ring_active_color: "rgb(76, 175, 80, 0.75)",
      show_name: true,
      mirror_layout: false,
      custom_states: []
    };
  }
};
customElements.define("modular-person-entity-card", ModularPersonEntityCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "modular-person-entity-card",
  name: "Modular Person Card",
  description: "Compact person/device tracker card with optional popup and ring indicator."
});
