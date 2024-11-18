import {
  LitElement,
  html,
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
// import 'https://unpkg.com/@material/mwc-button@0.27.0/mwc-button.js?module';
// import 'https://unpkg.com/@material/mwc-dialog@0.27.0/mwc-dialog.js?module';
// import 'panels/lovelace/cards/hui-map-card.js';
// import 'components/ha-entity-history-card.js';

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

    // Get proximity if available
    let proximity = null;
    if (this.config.proximity_entity && this.hass.states[this.config.proximity_entity]) {
      proximity = this.hass.states[this.config.proximity_entity].state;
    }

    // Get geocoded location if available
    const geocodedLocation = entity.attributes.geocoded_location || '';

    return html`
      <mwc-dialog open @closed="${this._close}" heading="${entity.attributes.friendly_name}">
        <div class="content">
          <div><strong>State:</strong> ${entity.state}</div>
          ${proximity ? html`<div><strong>Proximity:</strong> ${proximity}</div>` : ''}
          ${geocodedLocation ? html`<div><strong>Location:</strong> ${geocodedLocation}</div>` : ''}

          ${latitude && longitude ? html`
            <hui-map-card
              .hass="${this.hass}"
              .entities="${[this.entityId]}"
              style="height: 300px; margin-top: 16px;"
            ></hui-map-card>
          ` : html`<div>Location data not available.</div>`}

          <h3>History</h3>
          <ha-entity-history-card
            .hass="${this.hass}"
            .entityId="${this.entityId}"
            style="margin-top: 16px;"
          ></ha-entity-history-card>
        </div>
        <mwc-button slot="primaryAction" dialogAction="close">Close</mwc-button>
      </mwc-dialog>
    `;
  }

  _close() {
    this.parentNode.removeChild(this);
  }

  // static get styles() {
  //   return `
  //     mwc-dialog {
  //       --mdc-dialog-min-width: 600px;
  //     }
  //     .content {
  //       padding: 16px;
  //     }
  //     h3 {
  //       margin-top: 24px;
  //     }
  //   `;
  // }
}

customElements.define('modular-person-popup', ModularPersonPopup);