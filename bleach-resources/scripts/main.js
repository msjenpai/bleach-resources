/**********************************************
 * BLEACH RESOURCES - ITEM HELPERS
 **********************************************/

function getBleachResourceItem(actor, name) {
  return actor.items.find(
    item =>
      item.type === "feat" &&
      item.name === name
  );
}

function getItemResourceData(item) {
  if (!item) {
    return {
      value: 0,
      max: 0,
      spent: 0
    };
  }

  return {
    value: Number(item.system.uses.value) || 0,
    max: Number(item.system.uses.max) || 0,
    spent: Number(item.system.uses.spent) || 0
  };
}


/**********************************************
 * CHARACTER SHEET RESOURCE UI
 **********************************************/

Hooks.on("renderApplicationV2", async (app, element) => {

  const actor = app.actor;

  if (!actor) return;
  if (actor.type !== "character") return;

  const staminaItem =
    getBleachResourceItem(
      actor,
      "Stamina"
    );

  const reiryokuItem =
    getBleachResourceItem(
      actor,
      "Reiryoku"
    );

  const stamina =
    getItemResourceData(staminaItem);

  const reiryoku =
    getItemResourceData(reiryokuItem);

  // Prevent duplicate resource bars
  if (
    element.querySelector(
      ".bleach-resources"
    )
  ) {
    return;
  }

  // Find the HP meter
  const hpArea =
    element.querySelector(
      ".meter.sectioned.hit-points.meter-lg"
    );

  if (!hpArea) {
    console.warn(
      "BLEACH RESOURCES: HP area not found."
    );

    return;
  }


  /********************************************
   * RESOURCE PERCENTAGES
   ********************************************/

  const reiryokuPercent =
    reiryoku.max > 0
      ? Math.clamp(
          (reiryoku.value / reiryoku.max) * 100,
          0,
          100
        )
      : 0;

  const staminaPercent =
    stamina.max > 0
      ? Math.clamp(
          (stamina.value / stamina.max) * 100,
          0,
          100
        )
      : 0;


  /********************************************
   * RESOURCE HTML
   ********************************************/

  const resourceHTML = `
    <div class="bleach-resources">

      <div class="bleach-resource">

        <div class="bleach-resource-title">
          REIRYOKU
        </div>

        <div class="bleach-resource-bar">

          <div
            class="bleach-resource-fill reiatsu-fill"
            style="width: ${reiryokuPercent}%;">
          </div>

          <div class="bleach-resource-overlay">

            <input
              type="number"
              class="bleach-item-resource-input"
              data-resource="reiryoku"
              value="${reiryoku.value}"
              min="0"
              max="${reiryoku.max}"
            >

            <span class="bleach-resource-separator">
              /
            </span>

            <input
              type="number"
              class="bleach-resource-input"
              value="${reiryoku.max}"
              readonly
            >

          </div>

        </div>

      </div>


      <div class="bleach-resource">

        <div class="bleach-resource-title">
          STAMINA
        </div>

        <div class="bleach-resource-bar">

          <div
            class="bleach-resource-fill stamina-fill"
            style="width: ${staminaPercent}%;">
          </div>

          <div class="bleach-resource-overlay">

            <input
              type="number"
              class="bleach-item-resource-input"
              data-resource="stamina"
              value="${stamina.value}"
              min="0"
              max="${stamina.max}"
            >

            <span class="bleach-resource-separator">
              /
            </span>

            <input
              type="number"
              class="bleach-resource-input"
              value="${stamina.max}"
              readonly
            >

          </div>

        </div>

      </div>

    </div>
  `;

  hpArea.insertAdjacentHTML(
    "afterend",
    resourceHTML
  );

  activateBleachResourceInputs(
    app,
    element,
    actor
  );

});


/**********************************************
 * RESOURCE INPUT HANDLERS
 **********************************************/

function activateBleachResourceInputs(
  app,
  element,
  actor
) {

  const inputs =
    element.querySelectorAll(
      ".bleach-item-resource-input"
    );

  for (const input of inputs) {

    input.addEventListener(
      "change",
      async event => {

        const target =
          event.currentTarget;

        const resource =
          target.dataset.resource;

        const itemName =
          resource === "stamina"
            ? "Stamina"
            : "Reiryoku";

        const item =
          getBleachResourceItem(
            actor,
            itemName
          );

        if (!item) {
          ui.notifications.warn(
            `${itemName} feature not found.`
          );

          return;
        }

        const max =
          Number(item.system.uses.max) || 0;

        let newValue =
          Number(target.value);

        if (Number.isNaN(newValue)) {
          newValue = 0;
        }

        newValue =
          Math.clamp(
            newValue,
            0,
            max
          );

        const newSpent =
          max - newValue;

        await item.update({
          "system.uses.spent": newSpent
        });

        app.render(true);

      }
    );

  }

}