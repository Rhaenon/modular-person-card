import { LitElement, html, css } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class ModularPersonPopup extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      entityId: {},
    };
  }

  render() {
    if (!this.hass || !this.entityId) {
      return html``;
    }

    const entity = this.hass.states[this.entityId];
    if (!entity) {
      return html`<div>Entity not available: ${this.entityId}</div>`;
    }

    const latitude = entity.attributes.latitude;
    const longitude = entity.attributes.longitude;

    return html`
      <div class="overlay" @click="${this._close}">
        <div class="dialog" @click="${this._stopPropagation}">
          <!-- Header -->
          <div class="header">
            <div id="person-entity-row"></div>
            <!-- Close button -->
            <button
              class="close-button"
              @click="${this._close}"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <!-- Content -->
          <div class="content">
            <div id="proximity-entity-row"></div>

            ${latitude && longitude
              ? html`<div id="map"></div>`
              : html`<div>Location data not available.</div>`}

            <h3>History</h3>
            <div id="history"></div>
          </div>
          <!-- Footer -->
          <div class="footer">
            <button @click="${this._close}">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    // Wait for the component to render
    requestAnimationFrame(() => {
      this._initializeCards();
    });
  }

  async _initializeCards() {
    // Clear any existing elements to prevent duplicates
    const personEntityRowContainer = this.shadowRoot.getElementById("person-entity-row");
    const proximityEntityRowContainer = this.shadowRoot.getElementById("proximity-entity-row");
    const mapContainer = this.shadowRoot.getElementById("map");
    const historyContainer = this.shadowRoot.getElementById("history");

    if (personEntityRowContainer) {
      personEntityRowContainer.innerHTML = "";
    }

    if (proximityEntityRowContainer) {
      proximityEntityRowContainer.innerHTML = "";
    }

    if (mapContainer) {
      mapContainer.innerHTML = "";
    }

    if (historyContainer) {
      historyContainer.innerHTML = "";
    }

    await this._loadHelpers();

    // Create and append the person entity row in the header
    const personRowConfig = {
      entity: this.entityId,
      // You can add additional options here, such as name or icon overrides
    };

    const personRowElement = this._cardHelpers.createRowElement(personRowConfig);
    personRowElement.hass = this.hass;
    personEntityRowContainer.appendChild(personRowElement);

    // Create and append the proximity entity row
    if (this.config.proximity_entity) {
      const proximityRowConfig = {
        entity: this.config.proximity_entity,
        // You can add additional options here, such as name or icon overrides
      };

      const proximityRowElement = this._cardHelpers.createRowElement(proximityRowConfig);
      proximityRowElement.hass = this.hass;
      proximityEntityRowContainer.appendChild(proximityRowElement);
    }

    // Create and append the map card
    const mapCardConfig = {
      type: "map",
      entities: [this.entityId],
      default_zoom: 15,
      hours_to_show: 16, // Adjust as needed
      track: true, // Enable history tracking
    };

    const mapCardElement = await this._createCardElement(mapCardConfig);
    if (mapCardElement) {
      mapContainer.appendChild(mapCardElement);
    }

    // Create and append the history card
    const historyCardConfig = {
      type: "history-graph",
      entities: [this.entityId],
      hours_to_show: 16, // Adjust as needed
    };

    const historyCardElement = await this._createCardElement(historyCardConfig);
    if (historyContainer && historyCardElement) {
      historyContainer.appendChild(historyCardElement);
    }
  }

  async _loadHelpers() {
    if (!this._cardHelpers) {
      if (window.loadCardHelpers) {
        this._cardHelpers = await window.loadCardHelpers();
      } else {
        console.error("Card helpers not available");
      }
    }
  }

  async _createCardElement(config) {
    if (!this._cardHelpers) {
      await this._loadHelpers();
    }

    const element = await this._cardHelpers.createCardElement(config);
    element.hass = this.hass;

    // Handle potential errors in card elements
    if (element.tagName === "HUI-ERROR-CARD") {
      console.error(`Error creating card: ${element.config.error}`);
      return null;
    }

    // Wait for the element to update
    if (element.updateComplete) {
      // await element.updateComplete;
    }

    return element;
  }

  _close() {
    this.parentNode.removeChild(this);
  }

  _stopPropagation(e) {
    e.stopPropagation();
  }

  static get styles() {
    return css`
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .dialog {
        background-color: var(--card-background-color, white);
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        max-width: 600px;
        width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--divider-color);
      }
      .header > #person-entity-row {
        flex: 1;
      }
      .close-button {
        background: none;
        border: none;
        font-size: 1.5em;
        line-height: 1;
        cursor: pointer;
        color: var(--secondary-text-color);
      }
      .content {
        padding: 16px;
        flex: 1;
        overflow: auto;
      }
      .footer {
        padding: 16px;
        border-top: 1px solid var(--divider-color);
        text-align: right;
      }
      .footer button {
        padding: 8px 16px;
        font-size: 1em;
        cursor: pointer;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 4px;
      }
      h3 {
        margin-top: 24px;
      }
    `;
  }
}

customElements.define("modular-person-popup", ModularPersonPopup);
