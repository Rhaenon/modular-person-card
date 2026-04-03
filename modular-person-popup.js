import { LitElement, html, css } from
  "https://cdn.jsdelivr.net/npm/lit-element@2.4.0/+esm?module";

class ModularPersonPopup extends LitElement {
  static get properties() {
    return { hass: {}, config: {}, entityId: {} };
  }

  createRenderRoot() {
    // Built-in Home Assistant cards can lose app/theme context inside
    // an isolated shadow root, which breaks richer cards like map/history.
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
    if (
      changedProps.has("hass") ||
      changedProps.has("config") ||
      changedProps.has("entityId")
    ) {
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

    [personContainer, proximityContainer, ringRowsContainer, customRowsContainer, mapContainer]
      .forEach((el) => { el.innerHTML = ""; });

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

    const customStateRows = Array.isArray(this.config?.custom_states)
      ? this.config.custom_states
      : [];
    const excludedEntities = new Set([
      this.entityId,
      this.config?.proximity_entity,
      this.config?.findPhoneScriptId,
      ringEntityId,
      ringBooleanEntityId,
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
      default_zoom: 15,
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

  _showMoreInfoView(entityId, view = undefined) {
    this._close();

    requestAnimationFrame(() => {
      const event = new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        // HA's more-info dialog supports an optional view parameter on newer
        // frontends. Keep tab for older compatibility; if unsupported, HA
        // will still open the default more-info dialog for the entity.
        detail: view ? { entityId, view, tab: view } : { entityId },
      });
      const appRoot =
        document.querySelector("home-assistant") ||
        document.querySelector("hc-main") ||
        document.body;
      appRoot.dispatchEvent(event);
    });
  }

  _close() { this.parentNode?.removeChild(this); }
  _stopPropagation(e) { e.stopPropagation(); }

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
}

customElements.define("modular-person-popup", ModularPersonPopup);
