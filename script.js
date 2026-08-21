"use strict";

/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

/*
 * Replace these two values with the values from your
 * Supabase project settings.
 *
 * The anon/publishable key is intended for browser use when
 * Row Level Security is enabled.
 *
 * Never place the service_role key in this file.
 */

const SUPABASE_URL =
    "https://hnlzxvzeshpavzhxexpx.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_nuQr0yXc8QkURfJPYgdEyw_-N9su90k";

/*
 * This must exactly match an allowed redirect URL under:
 *
 * Supabase
 * Authentication
 * URL Configuration
 */

const AUTH_REDIRECT_URL =
    "https://hellerz85.github.io/options-journal/";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

if (!window.supabase) {
    throw new Error(
        "The Supabase JavaScript library did not load. " +
        "Make sure the Supabase CDN script appears before script.js."
    );
}

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let trades = [];
let currentUser = null;
let isLoadingTrades = false;


/* =========================================================
   ELEMENT HELPER
   ========================================================= */

function getElement(id) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.error(
            `Required page element was not found: ${id}`
        );
    }

    return element;
}


/* =========================================================
   INITIAL DATE DISPLAY
   ========================================================= */

const todayDate =
    getElement("todayDate");

if (todayDate) {

    todayDate.textContent =
        new Date().toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


/* =========================================================
   CONFIGURATION VALIDATION
   ========================================================= */

function hasValidSupabaseConfiguration() {

    return (
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_URL.includes("YOUR_SUPABASE") &&
        !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
    );
}


/* =========================================================
   STATUS MESSAGES
   ========================================================= */

function showMessage(
    message,
    type = "loading"
) {

    const appMessage =
        getElement("appMessage");

    if (!appMessage) {
        return;
    }

    appMessage.textContent = message;

    appMessage.className =
        `app-message ${type}`;

    appMessage.hidden = false;
}


function hideMessage() {

    const appMessage =
        getElement("appMessage");

    if (!appMessage) {
        return;
    }

    appMessage.hidden = true;
    appMessage.textContent = "";
    appMessage.className = "app-message";
}


/* =========================================================
   BUTTON BUSY STATE
   ========================================================= */

function setButtonBusy(
    button,
    busy,
    busyText,
    normalText
) {

    if (!button) {
        return;
    }

    button.disabled = busy;

    button.textContent =
        busy
            ? busyText
            : normalText;
}


/* =========================================================
   GITHUB AUTHENTICATION
   ========================================================= */

async function signIn() {

    if (!hasValidSupabaseConfiguration()) {

        showMessage(
            "Add your Supabase project URL and " +
            "publishable/anon key at the top of script.js.",
            "error"
        );

        return;
    }

    const loginButton =
        getElement("loginBtn");

    setButtonBusy(
        loginButton,
        true,
        "Redirecting...",
        "Sign in with GitHub"
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithOAuth(
                {
                    provider: "github",

                    options: {
                        redirectTo:
                            AUTH_REDIRECT_URL
                    }
                }
            );

        if (error) {
            throw error;
        }

        /*
         * Supabase normally redirects the browser immediately.
         * This condition protects against an unexpected response
         * where no redirect URL is returned.
         */

        if (!data?.url) {

            setButtonBusy(
                loginButton,
                false,
                "Redirecting...",
                "Sign in with GitHub"
            );
        }

    } catch (error) {

        console.error(
            "GitHub sign-in failed:",
            error
        );

        showMessage(
            `GitHub sign-in failed: ${
                error?.message ||
                "An unknown authentication error occurred."
            }`,
            "error"
        );

        setButtonBusy(
            loginButton,
            false,
            "Redirecting...",
            "Sign in with GitHub"
        );
    }
}


async function signOut() {

    const logoutButton =
        getElement("logoutBtn");

    setButtonBusy(
        logoutButton,
        true,
        "Logging out...",
        "Log out"
    );

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        trades = [];
        currentUser = null;

        updateAuthUI(null);
        render();

    } catch (error) {

        console.error(
            "Sign-out failed:",
            error
        );

        showMessage(
            `Sign-out failed: ${
                error?.message ||
                "An unknown authentication error occurred."
            }`,
            "error"
        );

    } finally {

        setButtonBusy(
            logoutButton,
            false,
            "Logging out...",
            "Log out"
        );
    }
}


/* =========================================================
   AUTHENTICATION UI
   ========================================================= */

function updateAuthUI(user) {

    currentUser =
        user || null;

    const loginButton =
        getElement("loginBtn");

    const userInfo =
        getElement("userInfo");

    const userDisplay =
        getElement("userEmail");

    const userAvatar =
        getElement("userAvatar");

    const journalApp =
        getElement("journalApp");

    if (user) {

        const metadata =
            user.user_metadata || {};

        const displayName =
            metadata.user_name ||
            metadata.preferred_username ||
            metadata.name ||
            user.email ||
            "GitHub user";

        if (loginButton) {
            loginButton.hidden = true;
        }

        if (userInfo) {
            userInfo.hidden = false;
        }

        if (journalApp) {
            journalApp.hidden = false;
        }

        if (userDisplay) {
            userDisplay.textContent =
                displayName;
        }

        if (
            userAvatar &&
            metadata.avatar_url
        ) {

            userAvatar.src =
                metadata.avatar_url;

            userAvatar.alt =
                `${displayName} GitHub avatar`;

            userAvatar.hidden = false;

        } else if (userAvatar) {

            userAvatar.removeAttribute(
                "src"
            );

            userAvatar.alt = "";
            userAvatar.hidden = true;
        }

    } else {

        if (loginButton) {
            loginButton.hidden = false;
        }

        if (userInfo) {
            userInfo.hidden = true;
        }

        if (journalApp) {
            journalApp.hidden = true;
        }

        if (userDisplay) {
            userDisplay.textContent = "";
        }

        if (userAvatar) {

            userAvatar.removeAttribute(
                "src"
            );

            userAvatar.alt = "";
            userAvatar.hidden = true;
        }

        showMessage(
            "Sign in with GitHub to access your journal.",
            "loading"
        );
    }
}


/* =========================================================
   DATABASE MAPPING
   ========================================================= */

/*
 * Converts a Supabase/PostgreSQL row into the property names
 * already used by the Options Journal UI.
 */

function fromDatabaseRow(row) {

    return {
        id:
            row.id,

        ticker:
            row.ticker,

        type:
            row.type,

        side:
            row.side,

        strategy:
            row.strategy,

        strike:
            row.strike,

        exp:
            row.exp,

        contracts:
            row.contracts,

        entryDate:
            row.entry_date,

        entryPrice:
            row.entry_price,

        exitDate:
            row.exit_date,

        exitPrice:
            row.exit_price,

        notes:
            row.notes || "",

        createdAt:
            row.created_at
    };
}


/*
 * Converts a UI trade object into the column names expected by
 * the Supabase trades table.
 */

function toDatabaseRow(trade) {

    if (!currentUser) {

        throw new Error(
            "You must be signed in before saving a trade."
        );
    }

    return {
        id:
            trade.id,

        user_id:
            currentUser.id,

        ticker:
            trade.ticker,

        type:
            trade.type,

        side:
            trade.side,

        strategy:
            trade.strategy,

        strike:
            Number(trade.strike),

        exp:
            trade.exp || null,

        contracts:
            Number(trade.contracts || 1),

        entry_date:
            trade.entryDate || null,

        entry_price:
            Number(trade.entryPrice),

        exit_date:
            trade.exitDate || null,

        exit_price:
            trade.exitPrice === "" ||
            trade.exitPrice === null ||
            trade.exitPrice === undefined
                ? null
                : Number(trade.exitPrice),

        notes:
            trade.notes || ""
    };
}


/* =========================================================
   LOAD TRADES
   ========================================================= */

async function loadTrades() {

    if (
        !currentUser ||
        isLoadingTrades
    ) {
        return;
    }

    isLoadingTrades = true;

    showMessage(
        "Loading your journal...",
        "loading"
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("trades")
                .select("*")
                .order(
                    "entry_date",
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        trades =
            (data || []).map(
                fromDatabaseRow
            );

        hideMessage();
        render();

    } catch (error) {

        console.error(
            "Could not load trades:",
            error
        );

        trades = [];
        render();

        showMessage(
            `Could not load trades: ${
                error?.message ||
                "An unknown database error occurred."
            }`,
            "error"
        );

    } finally {

        isLoadingTrades = false;
    }
}


/* =========================================================
   CREATE TRADE
   ========================================================= */

async function insertTrade(trade) {

    const databaseTrade =
        toDatabaseRow(trade);

    const {
        data,
        error
    } =
        await supabaseClient
            .from("trades")
            .insert(databaseTrade)
            .select("*")
            .single();

    if (error) {
        throw error;
    }

    return fromDatabaseRow(data);
}


/* =========================================================
   CLOSE POSITION
   ========================================================= */

async function promptClose(id) {

    const trade =
        trades.find(
            item =>
                item.id === id
        );

    if (!trade) {
        return;
    }

    const price =
        window.prompt(
            `Exit price for ${trade.ticker} ` +
            `${trade.type} $${trade.strike} ` +
            "(per share):"
        );

    if (
        price === null ||
        price.trim() === ""
    ) {
        return;
    }

    const numericPrice =
        Number(price);

    if (
        !Number.isFinite(
            numericPrice
        ) ||
        numericPrice < 0
    ) {

        window.alert(
            "Enter a valid non-negative exit price."
        );

        return;
    }

    const date =
        window.prompt(
            "Exit date (YYYY-MM-DD):",
            new Date()
                .toISOString()
                .slice(0, 10)
        );

    if (date === null) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("trades")
                .update(
                    {
                        exit_price:
                            numericPrice,

                        exit_date:
                            date || null
                    }
                )
                .eq(
                    "id",
                    id
                )
                .select("*")
                .single();

        if (error) {
            throw error;
        }

        const updatedTrade =
            fromDatabaseRow(data);

        trades =
            trades.map(
                item =>
                    item.id === id
                        ? updatedTrade
                        : item
            );

        render();

    } catch (error) {

        console.error(
            "Could not close position:",
            error
        );

        window.alert(
            `Position was not closed: ${
                error?.message ||
                "An unknown database error occurred."
            }`
        );
    }
}


/* =========================================================
   DELETE TRADE
   ========================================================= */

async function deleteTrade(id) {

    const confirmed =
        window.confirm(
            "Delete this entry? This cannot be undone."
        );

    if (!confirmed) {
        return;
    }

    try {

        const {
            error
        } =
            await supabaseClient
                .from("trades")
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        trades =
            trades.filter(
                trade =>
                    trade.id !== id
            );

        render();

    } catch (error) {

        console.error(
            "Could not delete trade:",
            error
        );

        window.alert(
            `Trade was not deleted: ${
                error?.message ||
                "An unknown database error occurred."
            }`
        );
    }
}


/* =========================================================
   P&L CALCULATION
   ========================================================= */

function calculatePnl(trade) {

    if (
        trade.exitPrice === null ||
        trade.exitPrice === undefined ||
        trade.exitPrice === ""
    ) {
        return null;
    }

    const entryPrice =
        Number(trade.entryPrice);

    const exitPrice =
        Number(trade.exitPrice);

    const contracts =
        Number(trade.contracts || 1);

    const multiplier =
        trade.side === "Long"
            ? 1
            : -1;

    return (
        (
            exitPrice -
            entryPrice
        ) *
        multiplier *
        100 *
        contracts
    );
}


function formatMoney(value) {

    const sign =
        value < 0
            ? "-"
            : "+";

    return (
        sign +
        "$" +
        Math.abs(value).toFixed(2)
    );
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(value) {

    const temporaryElement =
        document.createElement("div");

    temporaryElement.textContent =
        String(value ?? "");

    return temporaryElement.innerHTML;
}


/* =========================================================
   SUMMARY RENDERING
   ========================================================= */

function renderSummary() {

    const summary =
        getElement("summary");

    if (!summary) {
        return;
    }

    const closedTrades =
        trades.filter(
            trade =>
                calculatePnl(trade) !== null
        );

    const openTrades =
        trades.filter(
            trade =>
                calculatePnl(trade) === null
        );

    const netPnl =
        closedTrades.reduce(
            (sum, trade) =>
                sum +
                calculatePnl(trade),
            0
        );

    const wins =
        closedTrades.filter(
            trade =>
                calculatePnl(trade) > 0
        ).length;

    const winRate =
        closedTrades.length > 0
            ? Math.round(
                (
                    wins /
                    closedTrades.length
                ) *
                100
            )
            : 0;

    const pnlClass =
        netPnl > 0
            ? "pos"
            : netPnl < 0
                ? "neg"
                : "neu";

    summary.innerHTML = `
        <div class="stat">
            <div class="stat-label">
                Net P&amp;L
            </div>

            <div class="stat-value ${pnlClass}">
                ${
                    closedTrades.length
                        ? formatMoney(netPnl)
                        : "—"
                }
            </div>
        </div>

        <div class="stat">
            <div class="stat-label">
                Win Rate
            </div>

            <div class="stat-value neu">
                ${
                    closedTrades.length
                        ? `${winRate}%`
                        : "—"
                }
            </div>
        </div>

        <div class="stat">
            <div class="stat-label">
                Open Positions
            </div>

            <div class="stat-value neu">
                ${openTrades.length}
            </div>
        </div>

        <div class="stat">
            <div class="stat-label">
                Total Trades
            </div>

            <div class="stat-value neu">
                ${trades.length}
            </div>
        </div>
    `;
}


/* =========================================================
   FILTERING
   ========================================================= */

function getFilteredTrades() {

    const statusFilter =
        getElement("filterStatus")
            ?.value || "all";

    const typeFilter =
        getElement("filterType")
            ?.value || "all";

    const tickerFilter =
        getElement("filterTicker")
            ?.value
            ?.trim()
            ?.toUpperCase() || "";

    return trades
        .filter(
            trade => {

                const pnl =
                    calculatePnl(trade);

                if (
                    statusFilter === "open" &&
                    pnl !== null
                ) {
                    return false;
                }

                if (
                    statusFilter === "closed" &&
                    pnl === null
                ) {
                    return false;
                }

                if (
                    typeFilter !== "all" &&
                    trade.type !== typeFilter
                ) {
                    return false;
                }

                if (
                    tickerFilter &&
                    !String(
                        trade.ticker
                    )
                        .toUpperCase()
                        .includes(
                            tickerFilter
                        )
                ) {
                    return false;
                }

                return true;
            }
        )
        .sort(
            (first, second) => {

                const firstDate =
                    first.entryDate || "";

                const secondDate =
                    second.entryDate || "";

                return secondDate.localeCompare(
                    firstDate
                );
            }
        );
}


/* =========================================================
   LEDGER RENDERING
   ========================================================= */

function renderLedger() {

    const container =
        getElement("ledgerContainer");

    if (!container) {
        return;
    }

    const filteredTrades =
        getFilteredTrades();

    if (trades.length === 0) {

        container.innerHTML = `
            <div class="empty">
                <h4>No entries yet</h4>

                <p>
                    Log your first position to start the ledger.
                </p>
            </div>
        `;

        return;
    }

    if (filteredTrades.length === 0) {

        container.innerHTML = `
            <div class="empty">
                <h4>No matches</h4>

                <p>
                    Try adjusting your filters.
                </p>
            </div>
        `;

        return;
    }

    const rows =
        filteredTrades.map(
            trade => {

                const pnl =
                    calculatePnl(trade);

                const stampClass =
                    pnl === null
                        ? "open"
                        : pnl > 0
                            ? "win"
                            : "loss";

                const stampText =
                    pnl === null
                        ? "OPEN"
                        : pnl > 0
                            ? "WIN"
                            : "LOSS";

                const pnlClass =
                    pnl === null
                        ? "neu"
                        : pnl > 0
                            ? "pos"
                            : "neg";

                const pnlDisplay =
                    pnl === null
                        ? "—"
                        : formatMoney(pnl);

                const notes =
                    trade.notes
                        ? escapeHtml(
                            trade.notes
                        )
                        : "Strategy";

                return `
                    <div class="row">

                        <div class="stamp ${stampClass}">
                            ${stampText}
                        </div>

                        <div class="ticker-cell">
                            ${escapeHtml(trade.ticker)}

                            <span class="sub">
                                ${escapeHtml(trade.type)}
                                ·
                                ${escapeHtml(trade.side)}
                            </span>
                        </div>

                        <div>
                            ${escapeHtml(trade.strategy)}

                            <span
                                class="sub notes"
                                title="${notes}"
                            >
                                ${notes}
                            </span>
                        </div>

                        <div>
                            $${escapeHtml(trade.strike)}

                            <span class="sub">
                                Strike
                            </span>
                        </div>

                        <div>
                            ${escapeHtml(trade.exp || "—")}

                            <span class="sub">
                                Expiration
                            </span>
                        </div>

                        <div>
                            ${escapeHtml(trade.contracts)}
                            x @
                            $${Number(
                                trade.entryPrice
                            ).toFixed(2)}

                            <span class="sub">
                                ${escapeHtml(
                                    trade.entryDate ||
                                    "Entry"
                                )}
                            </span>
                        </div>

                        <div class="pnl-cell ${pnlClass}">
                            ${pnlDisplay}

                            <span class="sub">
                                ${
                                    pnl === null
                                        ? "Unrealized"
                                        : escapeHtml(
                                            trade.exitDate ||
                                            "Closed"
                                        )
                                }
                            </span>
                        </div>

                        <div class="row-actions">

                            ${
                                pnl === null
                                    ? `
                                        <button
                                            class="icon-btn"
                                            type="button"
                                            data-action="close"
                                            data-id="${escapeHtml(trade.id)}"
                                        >
                                            Close
                                        </button>
                                    `
                                    : ""
                            }

                            <button
                                class="icon-btn"
                                type="button"
                                data-action="delete"
                                data-id="${escapeHtml(trade.id)}"
                            >
                                Delete
                            </button>

                        </div>

                    </div>
                `;
            }
        )
        .join("");

    container.innerHTML = `
        <div class="ledger">

            <div class="ledger-head">
                <div></div>
                <div>Ticker</div>
                <div>Strategy</div>
                <div>Strike</div>
                <div>Expiration</div>
                <div>Entry</div>
                <div>P&amp;L</div>
                <div></div>
            </div>

            ${rows}

        </div>
    `;

    container
        .querySelectorAll(
            '[data-action="delete"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        deleteTrade(
                            button.dataset.id
                        )
                );
            }
        );

    container
        .querySelectorAll(
            '[data-action="close"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        promptClose(
                            button.dataset.id
                        )
                );
            }
        );
}


/* =========================================================
   MAIN RENDER FUNCTION
   ========================================================= */

function render() {

    renderSummary();
    renderLedger();
}


/* =========================================================
   FORM HELPERS
   ========================================================= */

function clearForm() {

    const fieldsToClear = [
        "f_ticker",
        "f_strike",
        "f_exp",
        "f_entryDate",
        "f_entryPrice",
        "f_exitPrice",
        "f_exitDate",
        "f_notes"
    ];

    fieldsToClear.forEach(
        id => {

            const field =
                getElement(id);

            if (field) {
                field.value = "";
            }
        }
    );

    const contracts =
        getElement("f_contracts");

    if (contracts) {
        contracts.value = "1";
    }

    const type =
        getElement("f_type");

    if (type) {
        type.value = "Call";
    }

    const side =
        getElement("f_side");

    if (side) {
        side.value = "Long";
    }

    const strategy =
        getElement("f_strategy");

    if (strategy) {
        strategy.value = "Single Leg";
    }
}


function setFormExpanded(expanded) {

    const formPanel =
        getElement("formPanel");

    const toggleButton =
        getElement("toggleForm");

    if (!formPanel) {
        return;
    }

    formPanel.classList.toggle(
        "open",
        expanded
    );

    if (toggleButton) {

        toggleButton.setAttribute(
            "aria-expanded",
            String(expanded)
        );
    }
}


/* =========================================================
   SAVE FORM
   ========================================================= */

async function saveTradeFromForm() {

    if (!currentUser) {

        showMessage(
            "Sign in with GitHub before saving a trade.",
            "error"
        );

        return;
    }

    const ticker =
        getElement("f_ticker")
            ?.value
            ?.trim()
            ?.toUpperCase() || "";

    const entryPrice =
        getElement("f_entryPrice")
            ?.value
            ?.trim() || "";

    const strike =
        getElement("f_strike")
            ?.value
            ?.trim() || "";

    const contracts =
        getElement("f_contracts")
            ?.value
            ?.trim() || "1";

    const exitPrice =
        getElement("f_exitPrice")
            ?.value
            ?.trim() || "";

    if (
        !ticker ||
        !entryPrice ||
        !strike
    ) {

        window.alert(
            "Ticker, strike, and entry price are required."
        );

        return;
    }

    if (
        !Number.isFinite(
            Number(entryPrice)
        ) ||
        Number(entryPrice) < 0
    ) {

        window.alert(
            "Enter a valid non-negative entry price."
        );

        return;
    }

    if (
        !Number.isFinite(
            Number(strike)
        ) ||
        Number(strike) < 0
    ) {

        window.alert(
            "Enter a valid non-negative strike."
        );

        return;
    }

    if (
        !Number.isInteger(
            Number(contracts)
        ) ||
        Number(contracts) < 1
    ) {

        window.alert(
            "Contracts must be a whole number of at least 1."
        );

        return;
    }

    if (
        exitPrice !== "" &&
        (
            !Number.isFinite(
                Number(exitPrice)
            ) ||
            Number(exitPrice) < 0
        )
    ) {

        window.alert(
            "Enter a valid non-negative exit price."
        );

        return;
    }

    const trade = {

        id:
            window.crypto.randomUUID(),

        ticker,

        type:
            getElement("f_type")
                ?.value || "Call",

        side:
            getElement("f_side")
                ?.value || "Long",

        strategy:
            getElement("f_strategy")
                ?.value || "Single Leg",

        strike,

        exp:
            getElement("f_exp")
                ?.value || "",

        contracts,

        entryDate:
            getElement("f_entryDate")
                ?.value || "",

        entryPrice,

        exitPrice,

        exitDate:
            getElement("f_exitDate")
                ?.value || "",

        notes:
            getElement("f_notes")
                ?.value
                ?.trim() || ""
    };

    const saveButton =
        getElement("saveTrade");

    setButtonBusy(
        saveButton,
        true,
        "Saving...",
        "Log Trade"
    );

    try {

        const savedTrade =
            await insertTrade(trade);

        trades.push(savedTrade);

        clearForm();
        setFormExpanded(false);
        hideMessage();
        render();

    } catch (error) {

        console.error(
            "Could not save trade:",
            error
        );

        window.alert(
            `Trade was not saved: ${
                error?.message ||
                "An unknown database error occurred."
            }`
        );

    } finally {

        setButtonBusy(
            saveButton,
            false,
            "Saving...",
            "Log Trade"
        );
    }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

const loginButton =
    getElement("loginBtn");

if (loginButton) {

    loginButton.addEventListener(
        "click",
        signIn
    );
}


const logoutButton =
    getElement("logoutBtn");

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        signOut
    );
}


const toggleFormButton =
    getElement("toggleForm");

if (toggleFormButton) {

    toggleFormButton.addEventListener(
        "click",
        () => {

            const formPanel =
                getElement("formPanel");

            const isOpen =
                formPanel?.classList.contains(
                    "open"
                ) || false;

            setFormExpanded(
                !isOpen
            );
        }
    );
}


const cancelFormButton =
    getElement("cancelForm");

if (cancelFormButton) {

    cancelFormButton.addEventListener(
        "click",
        () => {

            setFormExpanded(false);
            clearForm();
        }
    );
}


const saveTradeButton =
    getElement("saveTrade");

if (saveTradeButton) {

    saveTradeButton.addEventListener(
        "click",
        saveTradeFromForm
    );
}


[
    "filterStatus",
    "filterType"
].forEach(
    id => {

        const filter =
            getElement(id);

        if (filter) {

            filter.addEventListener(
                "change",
                renderLedger
            );
        }
    }
);


const tickerFilter =
    getElement("filterTicker");

if (tickerFilter) {

    tickerFilter.addEventListener(
        "input",
        renderLedger
    );
}


/* =========================================================
   AUTHENTICATION STATE LISTENER
   ========================================================= */

/*
 * Supabase emits authentication events after:
 *
 * - Initial page load
 * - Successful GitHub OAuth return
 * - Token refresh
 * - Logout
 *
 * setTimeout avoids starting a database request from directly
 * inside the authentication callback.
 */

supabaseClient.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        const user =
            session?.user || null;

        updateAuthUI(user);

        if (event === "SIGNED_OUT") {

            trades = [];
            render();

            return;
        }

        if (
            user &&
            (
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION"
            )
        ) {

            window.setTimeout(
                () => {
                    loadTrades();
                },
                0
            );
        }
    }
);


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

async function initializeApplication() {

    render();

    if (!hasValidSupabaseConfiguration()) {

        updateAuthUI(null);

        showMessage(
            "Setup required: add your Supabase project URL " +
            "and publishable/anon key at the top of script.js.",
            "error"
        );

        return;
    }

    showMessage(
        "Checking your login...",
        "loading"
    );

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        const user =
            data?.session?.user || null;

        updateAuthUI(user);

        if (user) {

            await loadTrades();

        } else {

            showMessage(
                "Sign in with GitHub to access your journal.",
                "loading"
            );
        }

    } catch (error) {

        console.error(
            "Application initialization failed:",
            error
        );

        updateAuthUI(null);

        showMessage(
            `Authentication initialization failed: ${
                error?.message ||
                "An unknown error occurred."
            }`,
            "error"
        );
    }
}


/* =========================================================
   START APPLICATION
   ========================================================= */

initializeApplication();