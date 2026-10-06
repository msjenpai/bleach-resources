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
 * UNIVERSAL REIRYOKU SYSTEM
 **********************************************/

function getBleachItemIdentifier(item) {
  return String(item?.system?.identifier ?? "")
    .trim()
    .toLowerCase();
}

function normalizeBleachLookupKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBleachItemLookupKeys(item) {
  if (!item) return [];

  return Array.from(
    new Set([
      normalizeBleachLookupKey(
        item.system?.identifier
      ),
      normalizeBleachLookupKey(
        item.name
      )
    ].filter(Boolean))
  );
}

/*
 * Reiryoku is a universal spiritual resource.
 *
 * Supported spiritual classes:
 * - Shinigami
 * - Quincy
 * - Fullbringer
 * - Hollow
 */
const BLEACH_SPIRITUAL_CLASS_IDENTIFIERS = new Set([
  "shinigami",
  "quincy",
  "fullbringer",
  "hollow"
]);

/*
 * Known feature-based Reiryoku modifiers.
 *
 * Future features may either be added here or use:
 *
 * flags.bleach-resources.reiryokuModifier
 *
 * Supported modes:
 *   add
 *   multiply
 *   override
 */
const BLEACH_REIRYOKU_FEATURE_MODIFIERS = Object.freeze({
  "ningen-kai-no-gadian": {
    mode: "add",
    value: 20,
    priority: 100,
    label: "Ningen-kai no Gādian"
  },

  /*
   * Legacy identifier retained in case an older
   * compendium Item used this spelling.
   */
  "ningen-kai-no-gaidian": {
    mode: "add",
    value: 20,
    priority: 100,
    label: "Ningen-kai no Gādian"
  },
  "background-soul-kings-host": {
  mode: "add",
  value: 20,
  priority: 50,
  label: "Soul King's Host"
}
});

function getTotalSpiritualClassLevels(actor) {
  if (!actor) return 0;

  return actor.items
    .filter(item =>
      item.type === "class" &&
      BLEACH_SPIRITUAL_CLASS_IDENTIFIERS.has(
        getBleachItemIdentifier(item)
      )
    )
    .reduce(
      (total, item) =>
        total +
        (Number(item.system?.levels) || 0),
      0
    );
}

function getBleachClassItem(actor, identifier) {
  if (!actor || !identifier) return null;

  const wanted = String(identifier)
    .trim()
    .toLowerCase();

  return actor.items.find(item =>
    item.type === "class" &&
    getBleachItemIdentifier(item) === wanted
  ) ?? null;
}

/*
 * Still used by Shinigami-specific mechanics such as
 * Kidō. This does not make Reiryoku Shinigami-specific.
 */
function getShinigamiClassItem(actor) {
  return getBleachClassItem(
    actor,
    "shinigami"
  );
}

function getSpiritTrainingRankCount(actor) {
  if (!actor) return 0;

  return actor.items.filter(item => {
    if (item.type !== "feat") return false;

    const identifier =
      getBleachItemIdentifier(item);

    return /^spirit-training-(?:[1-9]|10)$/.test(
      identifier
    );
  }).length;
}

function getReiryokuClassScaleValue(
  actor,
  classIdentifier
) {
  if (!actor || !classIdentifier) return null;

  const scaleValue = foundry.utils.getProperty(
    actor,
    `system.scale.${classIdentifier}.reiryoku.value`
  );

  const numericScale = Number(scaleValue);

  if (Number.isFinite(numericScale)) {
    return numericScale;
  }

  return null;
}

function getReiryokuClassContribution(
  actor,
  classItem
) {
  if (!actor || !classItem) return 0;
  if (classItem.type !== "class") return 0;

  const identifier =
    getBleachItemIdentifier(classItem);

  if (
    !BLEACH_SPIRITUAL_CLASS_IDENTIFIERS.has(
      identifier
    )
  ) {
    return 0;
  }

  /*
   * Every spiritual class can provide a universal
   * Reiryoku contribution through:
   *
   * @scale.<class>.reiryoku
   */
  const scaleValue =
    getReiryokuClassScaleValue(
      actor,
      identifier
    );

  if (scaleValue !== null) {
    return scaleValue;
  }

  /*
   * Shinigami has an established fallback:
   * 5 Reiryoku per Shinigami level.
   *
   * We deliberately do NOT invent fallback values
   * for Quincy, Fullbringer, or Hollow.
   */
  if (identifier === "shinigami") {
    const level = Number(
      classItem.system?.levels
    ) || 0;

    return level * 5;
  }

  return 0;
}

function getReiryokuClassContributions(actor) {
  if (!actor) return [];

  return actor.items
    .filter(item =>
      item.type === "class" &&
      BLEACH_SPIRITUAL_CLASS_IDENTIFIERS.has(
        getBleachItemIdentifier(item)
      )
    )
    .map(item => ({
      id: getBleachItemIdentifier(item),
      label: item.name,
      value: getReiryokuClassContribution(
        actor,
        item
      )
    }))
    .filter(entry =>
      Number.isFinite(entry.value)
    );
}

function normalizeReiryokuModifier(
  rawModifier,
  fallbackLabel = "Reiryoku Modifier"
) {
  if (!rawModifier) return null;

  const mode = String(
    rawModifier.mode ?? ""
  )
    .trim()
    .toLowerCase();

  if (
    ![
      "add",
      "multiply",
      "override"
    ].includes(mode)
  ) {
    return null;
  }

  const value = Number(
    rawModifier.value
  );

  if (!Number.isFinite(value)) {
    return null;
  }

  const priority = Number(
    rawModifier.priority
  );

  return {
    mode,
    value,
    priority: Number.isFinite(priority)
      ? priority
      : 0,
    label: String(
      rawModifier.label ??
      fallbackLabel
    )
  };
}

function getItemReiryokuFlagModifiers(item) {
  if (!item) return [];

  const raw = item.getFlag?.(
    "bleach-resources",
    "reiryokuModifier"
  );

  if (!raw) return [];

  const rawList =
    Array.isArray(raw)
      ? raw
      : [raw];

  return rawList
    .map(entry =>
      normalizeReiryokuModifier(
        entry,
        item.name
      )
    )
    .filter(Boolean);
}

function getReiryokuFeatureModifiers(actor) {
  if (!actor) return [];

  const modifiers = [];

  for (const item of actor.items) {
    if (item.type !== "feat") continue;

    const identifier =
      getBleachItemIdentifier(item);

    /*
     * Spirit Training:
     * +5 maximum Reiryoku per rank.
     */
    if (
      /^spirit-training-(?:[1-9]|10)$/.test(
        identifier
      )
    ) {
      modifiers.push({
        mode: "add",
        value: 5,
        priority: 50,
        label: item.name
      });

      continue;
    }

    /*
     * Feature-specific flags take precedence over
     * built-in definitions.
     */
    const flagModifiers =
      getItemReiryokuFlagModifiers(item);

    if (flagModifiers.length > 0) {
      modifiers.push(
        ...flagModifiers
      );

      continue;
    }
    
    if (
  identifier ===
  "background-infinite-reserves"
) {
  const spiritualLevels =
    getTotalSpiritualClassLevels(actor);

  modifiers.push({
    mode: "add",
    value:
      spiritualLevels * 10,
    priority: 50,
    label: item.name
  });

  continue;
}

if (
  identifier ===
  "background-soul-king-tiny-general-part"
) {
  const spiritualLevels =
    getTotalSpiritualClassLevels(actor);

  modifiers.push({
    mode: "add",
    value: spiritualLevels * 5,
    priority: 50,
    label: item.name
  });

  continue;
}

 const lookupKeys =
  getBleachItemLookupKeys(item);

const predefined =
  lookupKeys
    .map(key =>
      BLEACH_REIRYOKU_FEATURE_MODIFIERS[
        key
      ]
    )
    .find(Boolean);

    if (predefined) {
      const normalized =
        normalizeReiryokuModifier(
          predefined,
          item.name
        );

      if (normalized) {
        modifiers.push(
          normalized
        );
      }
    }
  }

  return modifiers;
}

function calculateReiryokuMaximum(actor) {
  if (!actor) {
    return {
      base: 0,
      maximum: 0,
      classContributions: [],
      modifiers: []
    };
  }

  const classContributions =
    getReiryokuClassContributions(actor);

  const base =
    classContributions.reduce(
      (total, entry) =>
        total + entry.value,
      0
    );

  const modifiers =
    getReiryokuFeatureModifiers(actor)
      .sort(
        (a, b) =>
          a.priority - b.priority
      );

  let maximum = base;

  /*
   * Additive modifiers first.
   */
  for (const modifier of modifiers) {
    if (modifier.mode !== "add") continue;

    maximum += modifier.value;
  }

  /*
   * Multipliers second.
   */
  for (const modifier of modifiers) {
    if (
      modifier.mode !== "multiply"
    ) {
      continue;
    }

    maximum *= modifier.value;
  }

  /*
   * Overrides last.
   */
  for (const modifier of modifiers) {
    if (
      modifier.mode !== "override"
    ) {
      continue;
    }

    maximum = modifier.value;
  }

  maximum = Math.max(
    0,
    Math.floor(maximum)
  );

  return {
    base,
    maximum,
    classContributions,
    modifiers
  };
}


/**********************************************
 * UNIVERSAL REIRYOKU STORAGE
 **********************************************/

/*
 * The ACTOR now owns the calculated maximum.
 *
 * The Reiryoku Item's Max Uses formula is:
 *
 * @flags.bleach-resources.reiryokuMax
 *
 * This means no class owns the resource itself.
 */
const BLEACH_REIRYOKU_MAX_FLAG =
  "reiryokuMax";

const BLEACH_REIRYOKU_MAX_FORMULA =
  "@flags.bleach-resources.reiryokuMax";

const bleachReiryokuSyncLocks =
  new Set();

const bleachReiryokuSyncTimers =
  new Map();

function getStoredReiryokuMaximum(actor) {
  if (!actor) return 0;

  const value = Number(
    actor.getFlag?.(
      "bleach-resources",
      BLEACH_REIRYOKU_MAX_FLAG
    )
  );

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function getReiryokuSourceMaxFormula(item) {
  return String(
    foundry.utils.getProperty(
      item?._source,
      "system.uses.max"
    ) ?? ""
  ).trim();
}

function scheduleBleachReiryokuSync(
  actor,
  delay = 100
) {
  if (!actor) return;
  if (actor.documentName !== "Actor") return;
  if (actor.type !== "character") return;

  const key =
    actor.uuid ?? actor.id;

  const existingTimer =
    bleachReiryokuSyncTimers.get(key);

  if (existingTimer) {
    clearTimeout(
      existingTimer
    );
  }

  const timer = setTimeout(
    async () => {

      bleachReiryokuSyncTimers.delete(
        key
      );

      try {

        await syncReiryokuMaximum(
          actor
        );

      } catch (err) {

        console.error(
          "BLEACH RESOURCES: Failed to synchronize Reiryoku maximum.",
          err
        );

      }

    },
    delay
  );

  bleachReiryokuSyncTimers.set(
    key,
    timer
  );
}

async function syncReiryokuMaximum(actor) {
  if (!actor) return;
  if (actor.type !== "character") return;

  const lockKey =
    actor.uuid ?? actor.id;

  if (
    bleachReiryokuSyncLocks.has(
      lockKey
    )
  ) {
    return;
  }

  bleachReiryokuSyncLocks.add(
    lockKey
  );

  try {

    const reiryokuItem =
      getBleachResourceItem(
        actor,
        "Reiryoku"
      );

    if (!reiryokuItem) {
      return;
    }

    const calculation =
      calculateReiryokuMaximum(
        actor
      );

    const desiredMaximum =
      calculation.maximum;

    /*
     * Capture CURRENT Reiryoku BEFORE changing the
     * actor flag or the Item's maximum formula.
     *
     * D&D5e stores Item Uses using maximum + spent.
     */
    const preparedValue = Number(
      reiryokuItem.system
        ?.uses?.value
    );

    const preparedMaximum = Number(
      reiryokuItem.system
        ?.uses?.max
    ) || 0;

    const currentSpent = Number(
      reiryokuItem.system
        ?.uses?.spent
    ) || 0;

    const currentValue =
      Number.isFinite(
        preparedValue
      )
        ? Math.max(
            0,
            preparedValue
          )
        : Math.max(
            0,
            preparedMaximum -
              currentSpent
          );

    const storedMaximum =
      getStoredReiryokuMaximum(
        actor
      );

    const sourceMaxFormula =
      getReiryokuSourceMaxFormula(
        reiryokuItem
      );

    /*
     * A brand-new Reiryoku resource starts full.
     *
     * After initialization, changing maximum
     * Reiryoku preserves CURRENT Reiryoku.
     */
    const isUninitialized =
      preparedMaximum <= 0 &&
      currentSpent <= 0 &&
      currentValue <= 0 &&
      storedMaximum <= 0;

    const preservedValue =
      isUninitialized
        ? desiredMaximum
        : Math.min(
            currentValue,
            desiredMaximum
          );

    const newSpent = Math.max(
      0,
      desiredMaximum -
        preservedValue
    );

    const maximumChanged =
      storedMaximum !==
        desiredMaximum;

    const formulaChanged =
      sourceMaxFormula !==
        BLEACH_REIRYOKU_MAX_FORMULA;

    const spentChanged =
      currentSpent !==
        newSpent;

    if (
      !maximumChanged &&
      !formulaChanged &&
      !spentChanged
    ) {
      return;
    }

    /*
     * Update the Actor's universal maximum first.
     *
     * render:false prevents a visible intermediate
     * resource state before spent uses are corrected.
     */
    if (maximumChanged) {

      await actor.update(
        {
          [`flags.bleach-resources.${BLEACH_REIRYOKU_MAX_FLAG}`]:
            desiredMaximum
        },
        {
          render: false,
          bleachReiryokuSync: true
        }
      );

    }

    const itemUpdate = {};

    /*
     * Self-heal old Reiryoku Items that still have
     * @scale.shinigami.reiryoku or another formula.
     */
    if (formulaChanged) {

      itemUpdate[
        "system.uses.max"
      ] =
        BLEACH_REIRYOKU_MAX_FORMULA;

    }

    /*
     * Preserve current Reiryoku while maximum changes.
     */
    if (spentChanged) {

      itemUpdate[
        "system.uses.spent"
      ] =
        newSpent;

    }

    if (
      Object.keys(
        itemUpdate
      ).length > 0
    ) {

      await reiryokuItem.update(
        itemUpdate,
        {
          bleachReiryokuSync: true
        }
      );

    }

    console.debug(
      "BLEACH RESOURCES: Reiryoku synchronized.",
      {
        actor:
          actor.name,

        currentValue:
          preservedValue,

        previousPreparedMaximum:
          preparedMaximum,

        previousStoredMaximum:
          storedMaximum,

        newMaximum:
          desiredMaximum,

        maxFormula:
          BLEACH_REIRYOKU_MAX_FORMULA,

        classContributions:
          calculation
            .classContributions,

        modifiers:
          calculation
            .modifiers
      }
    );

  } finally {

    bleachReiryokuSyncLocks.delete(
      lockKey
    );

  }
}


/**********************************************
 * REIRYOKU CHANGE DETECTION
 **********************************************/

function itemCanAffectReiryokuMaximum(item) {
  if (!item) return false;

  /*
   * Any spiritual class may affect maximum Reiryoku.
   */
  if (item.type === "class") {
    return true;
  }

  /*
   * Any Feature may potentially modify Reiryoku.
   *
   * This deliberately avoids hard-coding every
   * future Reiryoku-changing feature into our hooks.
   */
  if (item.type === "feat") {
    return true;
  }

  return false;
}

function isReiryokuResourceItem(item) {
  if (!item) return false;

  return (
    item.type === "feat" &&
    (
      getBleachItemIdentifier(
        item
      ) === "reiryoku" ||

      item.name ===
        "Reiryoku"
    )
  );
}


/**********************************************
 * PROTECT REIRYOKU MAX FORMULA
 **********************************************/

/*
 * This is the important protection against the bug
 * we just found.
 *
 * If an Advancement, Grant Items update, old source
 * Item, or other Foundry process attempts to restore:
 *
 * @scale.shinigami.reiryoku
 *
 * we replace it BEFORE the update is applied.
 */
Hooks.on(
  "preUpdateItem",
  (
    item,
    changes,
    options,
    userId
  ) => {

    if (
      !isReiryokuResourceItem(
        item
      )
    ) {
      return;
    }

    if (
      options?.bleachReiryokuSync
    ) {
      return;
    }

    /*
     * Foundry updates may arrive either flattened:
     *
     * "system.uses.max"
     *
     * or nested:
     *
     * system.uses.max
     *
     * Handle both forms.
     */
    const hasFlatMax =
      Object.prototype
        .hasOwnProperty.call(
          changes,
          "system.uses.max"
        );

    const hasNestedMax =
      foundry.utils
        .hasProperty(
          changes,
          "system.uses.max"
        );

    if (hasFlatMax) {

      changes[
        "system.uses.max"
      ] =
        BLEACH_REIRYOKU_MAX_FORMULA;

    } else if (hasNestedMax) {

      foundry.utils
        .setProperty(
          changes,
          "system.uses.max",
          BLEACH_REIRYOKU_MAX_FORMULA
        );

    }

  }
);


/**********************************************
 * REIRYOKU DOCUMENT HOOKS
 **********************************************/

Hooks.on(
  "createItem",
  async (
    item,
    options,
    userId
  ) => {

    const actor =
      item.parent;

    if (
      actor?.documentName !== "Actor"
    ) {
      return;
    }

    /*
     * A newly-granted Reiryoku resource must always
     * begin unspent.
     *
     * This prevents stale Item Uses data from the
     * source/compendium Item from carrying onto a
     * brand-new character.
     */
    if (
      isReiryokuResourceItem(item)
    ) {

      const spent = Number(
        item.system?.uses?.spent
      ) || 0;

      if (spent !== 0) {

        await item.update(
          {
            "system.uses.spent": 0
          },
          {
            render: false,
            bleachReiryokuSync: true
          }
        );

      }

      scheduleBleachReiryokuSync(
        actor,
        150
      );

      return;
    }

    if (
      itemCanAffectReiryokuMaximum(
        item
      )
    ) {

      scheduleBleachReiryokuSync(
        actor
      );

    }

  }
);

Hooks.on(
  "updateItem",
  (
    item,
    changes,
    options,
    userId
  ) => {

    const actor =
      item.parent;

    if (
      actor?.documentName !== "Actor"
    ) {
      return;
    }

    /*
     * Ignore our own synchronization update.
     */
    if (
      options?.bleachReiryokuSync
    ) {
      return;
    }

    /*
     * Spending/restoring Reiryoku changes the
     * Reiryoku Item itself.
     *
     * That should NEVER trigger capacity
     * recalculation.
     *
     * Attempts to modify its maximum are already
     * intercepted in preUpdateItem above.
     */
    if (
      isReiryokuResourceItem(
        item
      )
    ) {
      return;
    }

    if (
      itemCanAffectReiryokuMaximum(
        item
      )
    ) {

      scheduleBleachReiryokuSync(
        actor
      );

    }

  }
);

Hooks.on(
  "deleteItem",
  (
    item,
    options,
    userId
  ) => {

    const actor =
      item.parent;

    if (
      actor?.documentName === "Actor" &&
      itemCanAffectReiryokuMaximum(
        item
      )
    ) {

      /*
       * Wait until Foundry has actually removed the
       * Item from the Actor collection.
       */
      scheduleBleachReiryokuSync(
        actor,
        150
      );

    }

  }
);


/**********************************************
 * REIRYOKU INITIALIZATION
 **********************************************/

Hooks.once(
  "ready",
  () => {

    for (
      const actor of game.actors.contents
    ) {

      if (
        actor.type === "character" &&
        getBleachResourceItem(
          actor,
          "Reiryoku"
        )
      ) {

        scheduleBleachReiryokuSync(
          actor,
          250
        );

      }

    }

  }
);

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
 * KIDO LEVEL ELIGIBILITY
 **********************************************/

function getMaxKidoLevel(shinigamiLevel) {
  const level = Number(shinigamiLevel) || 0;

  if (level >= 17) return 9;
  if (level >= 15) return 8;
  if (level >= 13) return 7;
  if (level >= 11) return 6;
  if (level >= 9) return 5;
  if (level >= 7) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  if (level >= 2) return 1;

  return 0;
}

function getShinigamiLevel(actor) {
  const shinigami =
    getShinigamiClassItem(actor);

  return Number(
    shinigami?.system?.levels
  ) || 0;
}

function canLearnKidoAtLevel(spell, shinigamiLevel) {
  if (!spell || spell.type !== "spell") {
    return true;
  }

  const maxKidoLevel =
    getMaxKidoLevel(shinigamiLevel);

  const kidoLevel =
    Number(spell.system?.level) || 0;

  return kidoLevel <= maxKidoLevel;
}

function canLearnKido(actor, spell) {
  return canLearnKidoAtLevel(
    spell,
    getShinigamiLevel(actor)
  );
}


/**********************************************
 * ZANKENSOKI - KIDO CHOICE FILTERING
 **********************************************/

function resolveBleachUuidSync(uuid) {
  if (!uuid) return null;

  try {
    return fromUuidSync(uuid);
  } catch (err) {
    console.warn(
      "BLEACH RESOURCES: Could not resolve UUID.",
      uuid,
      err
    );

    return null;
  }
}

function isZankensokiChoiceFlow(flow) {
  const advancement =
    flow?.advancement;

  if (!advancement) return false;

  const owner =
    advancement.item ?? flow?.item;

  if (
    !owner ||
    owner.type !== "class" ||
    getBleachItemIdentifier(owner) !== "shinigami"
  ) {
    return false;
  }

  const config =
    advancement.configuration;

  if (!config) return false;

  // Zankensoki is the Shinigami's mixed "Anything"
  // Choose Items advancement.
  //
  // Fighting Style, Resistant, etc. use a specific
  // Item Type, so they will be ignored.
  if (config.type) return false;

  const pool =
    Array.from(config.pool ?? []);

  // Extra safety:
  // only treat the mixed chooser as Zankensoki
  // if its pool actually contains Spell items.
  return pool.some(entry => {
    const item =
      resolveBleachUuidSync(entry?.uuid);

    return item?.type === "spell";
  });
}

async function filterZankensokiKidoChoices(
  app,
  element
) {
  const flow =
    app?.step?.flow;

  if (!isZankensokiChoiceFlow(flow)) {
    return;
  }

  /*
   * featureLevel is important here.
   *
   * If a level-17 character later modifies their
   * level-2 Zankensoki choice, we still want that
   * old choice restricted to level-2 Kidō access.
   */
  const choiceLevel =
    Number(
      flow.featureLevel ??
      flow.level ??
      getShinigamiLevel(
        flow.advancement.actor ??
        app.clone ??
        app.actor
      )
    ) || 0;

  const maxKidoLevel =
    getMaxKidoLevel(choiceLevel);

  const rows =
    Array.from(
      element.querySelectorAll(
        ".item-list.current-level > .item[data-uuid]"
      )
    );

  await Promise.all(
    rows.map(async row => {
      const uuid =
        row.dataset.uuid;

      if (!uuid) return;

      let item = null;

      try {
        item = await fromUuid(uuid);
      } catch (err) {
        console.warn(
          "BLEACH RESOURCES: Could not inspect advancement item.",
          uuid,
          err
        );

        return;
      }

      /*
       * Only Spell items are filtered here.
       *
       * Zanjutsu, Hakuda, Hoho, and Spiritual
       * Expertises keep using Foundry's normal
       * Required Level / Required Item system.
       */
      if (item?.type !== "spell") {
        return;
      }

      if (
        !canLearnKidoAtLevel(
          item,
          choiceLevel
        )
      ) {
        row.remove();
      }
    })
  );

  console.debug(
    `BLEACH RESOURCES: Zankensoki Kidō filter active. ` +
    `Shinigami level ${choiceLevel}; ` +
    `maximum Kidō level ${maxKidoLevel}.`
  );
}


/**********************************************
 * ZANKENSOKI - LIVE KIDO FILTER
 **********************************************/

const bleachZankensokiObservers = new WeakMap();

function observeZankensokiKidoChoices(
  app,
  element
) {
  if (!element) return;

  // Don't attach more than one observer
  // to the same Advancement Manager element.
  if (bleachZankensokiObservers.has(element)) {
    return;
  }

  let filterScheduled = false;

  const runFilter = async () => {
    if (filterScheduled) return;

    filterScheduled = true;

    // Wait until Foundry finishes rebuilding
    // the choice list before filtering it.
    requestAnimationFrame(async () => {
      try {
        await filterZankensokiKidoChoices(
          app,
          element
        );
      } catch (err) {
        console.error(
          "BLEACH RESOURCES: Failed to re-filter Zankensoki Kidō choices.",
          err
        );
      } finally {
        filterScheduled = false;
      }
    });
  };

  const observer =
    new MutationObserver(mutations => {

      /*
       * We care primarily about Foundry adding /
       * rebuilding choice rows.
       *
       * Our own filter removes rows, so ignoring
       * removal-only mutations prevents needless
       * re-filter loops.
       */
      const hasAddedContent =
        mutations.some(
          mutation =>
            mutation.type === "childList" &&
            mutation.addedNodes.length > 0
        );

      if (!hasAddedContent) return;

      runFilter();
    });

  observer.observe(
    element,
    {
      childList: true,
      subtree: true
    }
  );

  bleachZankensokiObservers.set(
    element,
    observer
  );
}


/**********************************************
 * ADVANCEMENT RENDER HOOK
 **********************************************/

Hooks.on(
  "renderApplicationV2",
  async (app, element) => {

    try {

      // Apply immediately on first render.
      await filterZankensokiKidoChoices(
        app,
        element
      );

      // Then keep watching for Foundry to rebuild
      // the list after selections are changed.
      observeZankensokiKidoChoices(
        app,
        element
      );

    } catch (err) {

      console.error(
        "BLEACH RESOURCES: Failed to initialize Zankensoki Kidō filtering.",
        err
      );

    }

  }
);


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


/**********************************************
 * MASTERED ART - SHARED HELPERS
 **********************************************/

function actorHasBleachFeature(actor, identifier) {
  if (!actor || !identifier) return false;

  const wanted = String(identifier)
    .trim()
    .toLowerCase();

  return actor.items.some(item =>
    item.type === "feat" &&
    getBleachItemIdentifier(item) === wanted
  );
}

function getBleachProficiencyBonus(actor) {
  const direct = Number(
    actor?.system?.attributes?.prof
  );

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const rollDataProf = Number(
    actor?.getRollData?.()?.prof
  );

  return Number.isFinite(rollDataProf)
    ? rollDataProf
    : 0;
}


function getReiatsuDie(actor) {
  const wisdomMod = Number(
    actor?.system?.abilities?.wis?.mod
  ) || 0;

  /*
   * Original Soul Society progression:
   * +1 d4, +2 d6, +3 d8, +4 d10, +5 d12.
   *
   * Bleach Resources extends that same die-tier ladder
   * for Wisdom modifiers above +5.
   */
  if (wisdomMod >= 10) return "4d6";
  if (wisdomMod === 9) return "2d12";
  if (wisdomMod === 8) return "2d10";
  if (wisdomMod === 7) return "2d8";
  if (wisdomMod === 6) return "2d6";
  if (wisdomMod === 5) return "1d12";
  if (wisdomMod === 4) return "1d10";
  if (wisdomMod === 3) return "1d8";
  if (wisdomMod === 2) return "1d6";
  if (wisdomMod === 1) return "1d4";

  // The source does not define a Reiatsu die for
  // Wisdom modifiers of +0 or lower.
  return null;
}

function isHakudaMasteryUnarmedAttack(activity) {
  if (!activity) return false;
  if (activity.type !== "attack") return false;

  const classification = String(
    activity.attack?.type?.classification ?? ""
  ).toLowerCase();

  // Native / properly classified unarmed attacks.
  if (classification === "unarmed") {
    return true;
  }

  /*
   * Our baseline Unarmed Strike is intentionally
   * implemented as a Weapon Item so it can behave
   * cleanly on the character sheet.
   *
   * D&D5e therefore reports it as a weapon attack
   * rather than classification "unarmed".
   */
  const itemIdentifier =
    getBleachItemIdentifier(activity.item);

  if (itemIdentifier === "unarmed-strike") {
    return true;
  }

  return false;
}

function isPhysicalBleachDamageType(type) {
  return [
    "bludgeoning",
    "piercing",
    "slashing"
  ].includes(
    String(type ?? "").toLowerCase()
  );
}

function getBleachReiryokuItem(actor) {
  if (!actor) return null;

  return actor.items.find(item =>
    item.type === "feat" &&
    (
      getBleachItemIdentifier(item) === "reiryoku" ||
      item.name === "Reiryoku"
    )
  ) ?? null;
}

function isReiryokuConsumptionTarget(
  actor,
  target,
  reiryokuItem
) {
  if (!actor || !target || !reiryokuItem) {
    return false;
  }

  if (target.type !== "itemUses") {
    return false;
  }

  const reference = String(
    target.target ?? ""
  ).trim();

  // A blank Item Uses target means "this item",
  // so it is not the shared Reiryoku resource.
  if (!reference) return false;

  // Already linked to the Actor's Reiryoku Item.
  if (
    reference === reiryokuItem.id ||
    reference === reiryokuItem.uuid
  ) {
    return true;
  }

  // Public identifier used by the Bleach Resources
  // compendiums before an Actor-specific link exists.
  if (reference.toLowerCase() === "reiryoku") {
    return true;
  }

  // Actor Item ID reference.
  const embeddedItem = actor.items.get(reference);

  if (
    embeddedItem?.type === "feat" &&
    getBleachItemIdentifier(embeddedItem) === "reiryoku"
  ) {
    return true;
  }

  // Compendium UUID / world UUID reference.
  try {
    const referencedItem = fromUuidSync(reference);

    if (
      referencedItem?.type === "feat" &&
      getBleachItemIdentifier(referencedItem) === "reiryoku"
    ) {
      return true;
    }
  } catch (err) {
    // Not every stored target is a UUID. Ignore failures.
  }

  return false;
}

function getKidoCostReduction(actor) {
  if (!actor) return 0;

  const proficiency =
    getBleachProficiencyBonus(actor);

  let reduction = 0;

  // Kidō Efficiency:
  // 1 + half proficiency bonus, rounded down.
  if (
    actorHasBleachFeature(
      actor,
      "kido-efficiency"
    )
  ) {
    reduction +=
      1 + Math.floor(proficiency / 2);
  }

  // Kidō Mastery:
  // Reduce Kidō cost by proficiency bonus.
  if (
    actorHasBleachFeature(
      actor,
      "kido-mastery"
    )
  ) {
    reduction += proficiency;
  }

  return reduction;
}


/**********************************************
 * MASTERED ART - HAKUDA MASTERY
 **********************************************/

Hooks.on(
  "dnd5e.preRollDamageV2",
  (config, dialog, message) => {

    const activity = config?.subject;
    const actor = activity?.actor;

    if (!actor || actor.type !== "character") {
      return;
    }

    if (
      !actorHasBleachFeature(
        actor,
        "hakuda-mastery"
      )
    ) {
      return;
    }

    if (
      !isHakudaMasteryUnarmedAttack(activity)
    ) {
      return;
    }

    const rolls =
      Array.from(config?.rolls ?? []);

    /*
     * Hakuda Mastery changes normal physical damage
     * from an unarmed strike to Force.
     *
     * Explicit non-physical overrides such as Fire or
     * Lightning from Shunko are preserved rather than
     * erased by this generic mastery automation.
     */
    for (const rollConfig of rolls) {
      const damageType =
        rollConfig?.options?.type;

      if (
        isPhysicalBleachDamageType(
          damageType
        )
      ) {
        rollConfig.options ??= {};
        rollConfig.options.type = "force";
      }
    }

    const reiatsuDie =
      getReiatsuDie(actor);

    if (!reiatsuDie) {
      console.debug(
        `BLEACH RESOURCES: Hakuda Mastery applied ` +
        `to ${activity?.item?.name} - ${activity?.name}, ` +
        `but no Reiatsu die exists for the current ` +
        `Wisdom modifier.`
      );

      return;
    }

    /*
     * Add the Reiatsu die as its own Force damage
     * component. Keeping it separate means elemental
     * Shunko strikes can retain their explicit Fire or
     * Lightning damage while Hakuda Mastery still adds
     * the required Force damage.
     *
     * The damage workflow will run its normal build
     * process on this added roll configuration too.
     */
    const firstRoll =
      rolls[0];

    const criticalOptions =
      foundry.utils.deepClone(
        firstRoll?.options?.critical ?? {}
      );

    rolls.push({
      parts: [reiatsuDie],
      data: {},
      options: {
        type: "force",
        critical: criticalOptions
      }
    });

    config.rolls = rolls;

    console.debug(
      `BLEACH RESOURCES: Hakuda Mastery prepared ` +
      `${activity?.item?.name} - ${activity?.name}. ` +
      `Reiatsu die: ${reiatsuDie} Force.`
    );
  }
);


/**********************************************
 * KIDO - REIRYOKU TARGET LINKING
 **********************************************/

Hooks.on(
  "dnd5e.preUseActivity",
  (activity, usageConfig, dialogConfig, messageConfig) => {

    const actor = activity?.actor;
    const item = activity?.item;

    if (!actor || actor.type !== "character") {
      return;
    }

    // Kidō is represented by Spell Items in this
    // project. Do not touch non-spell activities.
    if (item?.type !== "spell") {
      return;
    }

    const reiryokuItem =
      getBleachReiryokuItem(actor);

    if (!reiryokuItem) return;

    const targets = Array.from(
      activity?.consumption?.targets ?? []
    );

    for (const target of targets) {

      if (
        !isReiryokuConsumptionTarget(
          actor,
          target,
          reiryokuItem
        )
      ) {
        continue;
      }

      /*
       * D&D5e 6 resolves embedded Item Uses
       * consumption by Actor Item ID.
       *
       * Our compendium uses the stable public
       * identifier "reiryoku" so every Actor can
       * share the same source Items. During use,
       * D&D5e has already cloned the spell Item.
       * Relink that temporary clone to this Actor's
       * actual Reiryoku Item ID.
       */
      if (target.target !== reiryokuItem.id) {
        target.updateSource({
          target: reiryokuItem.id
        });

        console.debug(
          `BLEACH RESOURCES: Linked ${item.name} - ` +
          `${activity.name} to Actor Reiryoku Item ` +
          `${reiryokuItem.id}.`
        );
      }
    }
  }
);


/**********************************************
 * MASTERED ART - KIDO COST REDUCTION
 **********************************************/

Hooks.on(
  "dnd5e.preActivityConsumption",
  (activity, usageConfig, messageConfig) => {

    const actor = activity?.actor;
    const item = activity?.item;

    if (!actor || actor.type !== "character") {
      return;
    }

    if (item?.type !== "spell") {
      return;
    }

    const reiryokuItem =
      getBleachReiryokuItem(actor);

    if (!reiryokuItem) return;

    const reduction =
      getKidoCostReduction(actor);

    const targets = Array.from(
      activity?.consumption?.targets ?? []
    );

    for (const target of targets) {

      if (
        !isReiryokuConsumptionTarget(
          actor,
          target,
          reiryokuItem
        )
      ) {
        continue;
      }

      // Safety fallback: make sure the temporary
      // Activity still points to the real Actor Item.
      if (target.target !== reiryokuItem.id) {
        target.updateSource({
          target: reiryokuItem.id
        });
      }

      // No mastery/efficiency means native cost,
      // but the Reiryoku target has still been fixed.
      if (reduction <= 0) {
        continue;
      }

      /*
       * Resolve the COMPLETE cost for this use first.
       * This includes Activity consumption scaling.
       */
      const costRoll = target.resolveCost({
        config: usageConfig,
        evaluate: false
      });

      // Reiryoku costs are expected to be deterministic.
      // Do not guess if a future ability uses dice/random
      // resource consumption.
      if (!costRoll?.isDeterministic) {
        console.warn(
          "BLEACH RESOURCES: Kidō cost reduction skipped " +
          "because the Reiryoku cost is non-deterministic.",
          item?.name,
          activity?.name
        );

        continue;
      }

      const originalCost = Number(
        costRoll.evaluateSync().total
      );

      if (
        !Number.isFinite(originalCost) ||
        originalCost <= 0
      ) {
        continue;
      }

      const reducedCost = Math.max(
        1,
        originalCost - reduction
      );

      /*
       * originalCost already contains the scaling for
       * this activation, so replace the temporary cost
       * with the final number and disable further
       * consumption scaling for this use.
       */
      target.updateSource({
        target: reiryokuItem.id,
        value: String(reducedCost),
        scaling: {
          mode: "",
          formula: ""
        }
      });

      console.debug(
        `BLEACH RESOURCES: ${item.name} - ` +
        `${activity.name} Reiryoku cost ` +
        `${originalCost} -> ${reducedCost} ` +
        `(reduction ${reduction}).`
      );
    }
  }
);