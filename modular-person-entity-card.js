import { LitElement, html, css } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class ModularPersonEntityCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        height: 100%;
        flex-grow: 1;
      }
      ha-card {
        padding: 4% 4%;
        font-family: Arial, sans-serif;
        background-color: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, white);
        display: flex;
        flex-direction: column;
        justify-content: var(--justify-content, center);
        align-items: center;
        min-height: 100px;
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
        align-items: center;
        justify-content: center;
        gap: var(--gap, 10px);
        text-align: var(--text-align, left);
        width: 100%;
        padding: var(--padding, 10px 5px 5px 10px);
      }
      .entity-picture-container {
        position: relative;
        display: inline-block;
        margin-right: var(--margin-right, 20px);
        margin-bottom: var(--margin-bottom, 0px);
        text-align: center;
      }
      .entity-picture {
        border-radius: 50%;
        width: 40px;
        height: 40px;
        border: solid 0.15em var(--icon-background-color);
        border-radius: 24px;
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
    this.config = config;
  }

  getCardSize() {
    return 1;
  }

  getLayoutOptions() {
    return {
      grid_rows: 2,
      grid_columns: 2,
      grid_min_rows: 2,
    };
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const entity = this.hass.states[this.config.entity];
    if (!entity) {
      return html`
        <style>
          ha-card {
            padding: 16px;
            font-family: Arial, sans-serif;
          }
        </style>
        <ha-card>Entity not available: ${this.config.entity}</ha-card>
      `;
    }

    const name = this.config.name || entity.attributes.friendly_name;
    const stateIcon = this._getStateIcon(entity);
    const iconBackgroundColor = this._getStateIconBackgroundColor(entity.state);
    const entityPicture =
      entity.attributes.entity_picture || "https://via.placeholder.com/40"; // Fallback image

    // Get state description with distance if applicable
    const stateText = this._getStateDescription(entity.state);

    const showName = this.config.show_name !== false; // Default to true if not explicitly set to false

    // Set styles based on whether the name is shown
    const layoutClass = showName ? "horizontal" : "vertical";
    const alignmentClass = showName ? "align-left" : "align-center";

    return html`
      <ha-card
        @click="${this._showPopup}"
        style="
          --icon-background-color: ${iconBackgroundColor};
          --flex-direction: ${showName ? "row" : "column"};
          --justify-content: ${showName ? "center" : "flex-start"};
          --gap: ${showName ? "10px" : "0"};
          --text-align: ${showName ? "left" : "center"};
          --padding: ${showName
            ? "10px 5px 5px 10px"
            : "10px 5px 5px 5px"};
          --margin-right: ${showName ? "20px" : "0px"};
          --margin-bottom: ${showName ? "0px" : "10px"};
        "
      >
        <div class="card-content ${layoutClass} ${alignmentClass}">
          <div class="entity-picture-container">
            <img src="${entityPicture}" class="entity-picture" />
            <div class="state-icon">
              <ha-icon icon="${stateIcon}"></ha-icon>
            </div>
          </div>
          <div class="entity-text-container">
            ${showName ? html`<div class="name-text">${name}</div>` : ""}
            <div class="state-text">${stateText}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _getStateDescription(state) {
    if (state === "home") {
      return "Home";
    } else if (state === "not_home") {
      // Handle distance display using proximity entity
      if (
        this.config.proximity_entity &&
        this.hass.states[this.config.proximity_entity]
      ) {
        const proximityState =
          this.hass.states[this.config.proximity_entity].state;
        const distance = parseFloat(proximityState);

        if (!isNaN(distance)) {
          if (distance < 1000) {
            return html`Away <br />(${distance}m)`;
          } else if (distance / 1000 < 1000) {
            return html`Away <br />(${(distance / 1000).toFixed(1)}km)`;
          } else if (distance / 1000 > 999) {
            return html`Away <br />(${(distance / 1000).toFixed(0)}km)`;
          }
        }
      }
      return "Away";
    } else if (state === "unknown" || state === "unavailable") {
      return "Unknown";
    }
    return state.charAt(0).toUpperCase() + state.slice(1); // Capitalizes any other states
  }

  _getStateIcon(entity) {
    if (this.config.custom_states) {
      const customState = this.config.custom_states.find(
        (cs) =>
          cs.entity === entity.entity_id && cs.state === entity.state
      );
      if (customState) {
        return customState.icon;
      }
    }

    // Check if the state is a zone and use its icon if available
    if (
      entity.state &&
      this.hass.states[`zone.${entity.state.toLowerCase()}`]
    ) {
      const zone =
        this.hass.states[`zone.${entity.state.toLowerCase()}`];
      return zone.attributes.icon || "mdi:map-marker";
    }

    if (entity.state === "home") return "mdi:home";
    if (entity.state === "not_home") return "mdi:home-export-outline";
    if (entity.state === "unknown" || entity.state === "unavailable")
      return "mdi:map-marker-question";
    return this.config.icon || "mdi:account";
  }

  _getStateIconBackgroundColor(state) {
    switch (state) {
      case "home":
        return "var(--home-icon-background-color, #478cff)"; // Use theme variable or fallback to blue
      case "not_home":
        return "var(--away-icon-background-color, #ff4d4d)"; // Use theme variable or fallback to red
      case "unknown":
      case "unavailable":
        return "var(--unknown-icon-background-color, #a0a0a0)"; // Use theme variable or fallback to grey
      default:
        return "var(--zone-icon-background-color, #32a852)"; // Use theme variable or fallback to green
    }
  }

async _showPopup() {
  const entityId = this.config.entity;
  const proximityEntityId = this.config.proximity_entity;
  const findPhoneScriptId = this.config.findPhoneScriptId;

  // Create an overlay to act as a backdrop for the dialog
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';

  // Create the dialog container
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = 'var(--card-background-color, white)';
  dialog.style.borderRadius = '6px';
  dialog.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  dialog.style.maxWidth = '500px';
  dialog.style.width = '90%';
  dialog.style.maxHeight = '90%';
  dialog.style.overflow = 'auto';
  dialog.style.padding = '16px';
  dialog.style.position = 'relative';

  // Create the header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '16px';

  const title = document.createElement('div');
  title.style.fontSize = '1.5em';
  title.style.fontWeight = 'bold';
  title.textContent = this.config.name || "Person Details";

  const closeButton = document.createElement('ha-icon-button');
  closeButton.setAttribute('label', 'Close');
  closeButton.setAttribute('icon', 'mdi:close');
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  header.appendChild(title);
  header.appendChild(closeButton);
  dialog.appendChild(header);

  // Create the vertical-stack card configuration
  const verticalStackConfig = {
    type: 'vertical-stack',
    cards: [],
  };

  // Add the entities card
  const entitiesCardConfig = {
    type: 'entities',
    state_color: true,
    entities: [
      {
        entity: entityId,
        secondary_info: 'last-changed',
        name:
          this.config.name ||
          this.hass.states[entityId].attributes.friendly_name ||
          entityId,
        tap_action: {
          action: 'more-info',
        },
      },
    ],
  };

  if (proximityEntityId && this.hass.states[proximityEntityId]) {
    entitiesCardConfig.entities.push({
      entity: proximityEntityId,
      name: 'Proximity',
      icon: 'mdi:map-marker-distance',
      tap_action: {
        action: 'more-info',
      },
    });
  }

  verticalStackConfig.cards.push(entitiesCardConfig);

  // Add the map card
  const mapCardConfig = {
    type: 'map',
    entities: [entityId],
    default_zoom: 15,
    aspect_ratio: '4:3',
    hours_to_show: 16,
  };
  verticalStackConfig.cards.push(mapCardConfig);

  // Add the history graph
  const historyCardConfig = {
    type: 'history-graph',
    hours_to_show: 16,
    entities: [
      {
        entity: entityId,
        name:
          this.config.name ||
          this.hass.states[entityId].attributes.friendly_name ||
          entityId,
        tap_action: {
          action: 'more-info',
        },
      },
    ],
  };
  verticalStackConfig.cards.push(historyCardConfig);

  // Add the Find Phone button card if available
  if (findPhoneScriptId && this.hass.states[findPhoneScriptId]) {
    const buttonCardConfig = {
      type: 'button',
      name: 'Find Phone', // Displayed name on the button
      tap_action: {
        action: 'call-service',
        service: 'script.turn_on', // Call the script service
        service_data: {
          entity_id: findPhoneScriptId,
        },
      },
      show_icon: false, // Hide the icon to show only the name
    };

    verticalStackConfig.cards.push(buttonCardConfig);
  }

  // Load card helpers
  let helpers;
  if (window.loadCardHelpers) {
    helpers = await window.loadCardHelpers();
  } else {
    helpers = null;
  }

  // Function to create Lovelace elements
  const createCardElement = async (config) => {
    let element;
    if (helpers) {
      element = await helpers.createCardElement(config);
    } else {
      // Fallback if helpers are not available
      const elClass = customElements.get(`hui-${config.type}-card`);
      if (elClass) {
        element = new elClass();
        element.setConfig(config);
      } else {
        element = null;
      }
    }
    if (element) {
      element.hass = this.hass;
    }
    return element;
  };

  // Create the vertical-stack card
  const verticalStackCard = await createCardElement(verticalStackConfig);
  if (verticalStackCard) {
    dialog.appendChild(verticalStackCard);
  } else {
    dialog.appendChild(
      document.createTextNode('Error creating vertical-stack card.')
    );
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Remove the dialog when clicking outside of it
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}


  // Adding support for the UI editor
  static getConfigElement() {
    return document.createElement("modular-person-entity-card-editor");
  }

  static getStubConfig(hass) {
    const personEntities = Object.keys(hass.states).filter((entityId) =>
      entityId.startsWith("person.")
    );

    const randomPerson =
      personEntities.length > 0
        ? personEntities[
            Math.floor(Math.random() * personEntities.length)
          ]
        : "person.fallback";

    // Extract the name from randomPerson (e.g., person.john -> john)
    const personName = randomPerson.split(".")[1];

    return {
      entity: randomPerson,
      proximity_entity: `sensor.home_${personName}_distance`, // Use dynamic proximity sensor based on the person name
      show_name: true,
    };
  }
}

customElements.define(
  "modular-person-entity-card",
  ModularPersonEntityCard
);
