import config from "../config.js";
import qrcode from "qrcode-terminal";

class WhatsAppGuardian {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
        this.status = {
            ready: false,
            authenticated: false,
            reconnecting: false,
            reconnectCount: 0,
            lastDisconnectReason: null,
            state: null,
            browserConnected: false,
            pageClosed: true,
            lastHealthCheck: null,
            unhealthySince: null,
            lastReadyAt: null,
            lastError: null
        };
        this.initializationInProgress = false;
        this.authenticationFailed = false;
        this.stopped = false;
        this.lastHealthLogAt = 0;
        this.lastRecoveryAt = 0;
        this.browserListenersAttached = new WeakSet();
    }

    start() {
        this.stopped = false;

        this.client.on("qr", qr => {
            this.logger.warning("WhatsApp membutuhkan QR Code.");
            qrcode.generate(qr, { small: true });
        });

        this.client.on("authenticated", () => {
            this.status.authenticated = true;
            this.authenticationFailed = false;
            this.logger.success("WhatsApp berhasil terautentikasi.");
        });

        this.client.on("ready", () => {
            this.status.ready = true;
            this.status.state = "CONNECTED";
            this.status.reconnecting = false;
            this.status.browserConnected = Boolean(this.client.pupBrowser?.isConnected?.());
            this.status.pageClosed = Boolean(this.client.pupPage?.isClosed?.());
            this.status.unhealthySince = null;
            this.status.lastReadyAt = Date.now();
            this.status.lastError = null;
            this.logger.success("[MONITOR] WhatsApp state: READY");
        });

        this.client.on("loading_screen", (percent, message) => {
            this.logger.info(`Loading ${percent}% - ${message}`);
        });

        this.client.on("disconnected", reason => {
            this.status.ready = false;
            this.status.lastDisconnectReason = reason;
            this.status.state = String(reason);
            this.markUnhealthy(`WhatsApp disconnected: ${reason}`);
            this.logger.warning(`[MONITOR] WhatsApp disconnected: ${reason}`);
        });

        this.client.on("auth_failure", message => {
            this.status.ready = false;
            this.status.authenticated = false;
            this.authenticationFailed = true;
            this.status.lastError = String(message);
            this.logger.error(`Authentication Failed: ${message}`);
        });

        this.client.on("change_state", state => {
            this.status.state = state;
            if (state !== "CONNECTED") {
                this.status.ready = false;
                this.markUnhealthy(`WhatsApp state changed: ${state}`);
            }
        });

        this.client.on("error", error => {
            this.status.lastError = error instanceof Error ? error.message : String(error);
            this.logger.error(`[MONITOR] WhatsApp client error: ${this.status.lastError}`);
            this.markUnhealthy("WhatsApp client error");
        });
    }

    setInitializationInProgress(value) {
        this.initializationInProgress = Boolean(value);
    }

    handleInitializationFailure(error) {
        this.initializationInProgress = false;
        this.status.ready = false;
        this.status.lastError = error instanceof Error ? error.message : String(error);
        this.logger.error(`[MONITOR] Client initialization failed: ${this.status.lastError}`);
        this.markUnhealthy("Client initialization failed");
    }

    markUnhealthy(reason) {
        if (!this.status.unhealthySince) {
            this.status.unhealthySince = Date.now();
            this.logger.warning(`[MONITOR] WhatsApp unhealthy: ${reason}`);
        }
    }

    attachBrowserListeners() {
        const browser = this.client.pupBrowser;
        if (!browser || this.browserListenersAttached.has(browser)) return;

        this.browserListenersAttached.add(browser);
        browser.on("disconnected", () => {
            this.status.browserConnected = false;
            this.status.ready = false;
            this.markUnhealthy("Browser disconnected");
            this.logger.error("[MONITOR] Browser unavailable");
        });
    }

    async reconnect() {
        if (this.stopped || this.status.reconnecting || this.authenticationFailed) return false;
        if (!this.status.unhealthySince) return false;

        const unhealthyFor = Date.now() - this.status.unhealthySince;
        if (unhealthyFor < config.whatsapp.gracePeriod) return false;
        if (Date.now() - this.lastRecoveryAt < config.whatsapp.recoveryCooldown) return false;

        if (this.status.reconnectCount >= config.whatsapp.maxRecoveryAttempts) {
            this.logger.error("[MONITOR] Maximum recovery attempts reached");
            this.lastRecoveryAt = Date.now();
            return false;
        }

        this.status.reconnecting = true;
        this.status.reconnectCount++;
        const attempt = this.status.reconnectCount;
        const delay = Math.min(
            config.whatsapp.recoveryBaseDelay * (2 ** (attempt - 1)),
            config.whatsapp.recoveryMaxDelay
        );

        this.logger.warning("[MONITOR] Recovery started");
        this.logger.warning(`[MONITOR] Recovery attempt: ${attempt}/${config.whatsapp.maxRecoveryAttempts}`);

        try {
            this.initializationInProgress = true;
            await this.client.destroy();
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.client.initialize();
            this.logger.success("[MONITOR] Recovery initialize completed; waiting for READY");
            return true;
        } catch (error) {
            this.status.lastError = error instanceof Error ? error.message : String(error);
            this.lastRecoveryAt = Date.now();
            this.logger.error(`[MONITOR] Recovery failed (attempt ${attempt}): ${this.status.lastError}`);
            this.markUnhealthy("Recovery failed");
            return false;
        } finally {
            this.initializationInProgress = false;
            this.status.reconnecting = false;
        }
    }

    async check() {
        this.status.lastHealthCheck = new Date();

        if (this.stopped) return true;
        this.attachBrowserListeners();

        const browser = this.client.pupBrowser;
        const page = this.client.pupPage;
        this.status.browserConnected = Boolean(browser?.isConnected?.());
        this.status.pageClosed = Boolean(!page || page.isClosed?.());

        if (this.initializationInProgress) return false;

        if (!this.status.browserConnected || this.status.pageClosed) {
            this.status.ready = false;
            this.markUnhealthy("Browser/page unavailable");
            return false;
        }

        try {
            this.status.state = await this.client.getState();
        } catch (error) {
            this.status.ready = false;
            this.status.lastError = error instanceof Error ? error.message : String(error);
            this.markUnhealthy("WhatsApp Web did not respond");
            return false;
        }

        const healthy = this.status.ready && this.status.state === "CONNECTED";
        if (!healthy) {
            this.markUnhealthy(`Unhealthy state: ${this.status.state || "unknown"}`);
            return false;
        }

        if (
            this.status.reconnectCount > 0 &&
            this.status.unhealthySince === null &&
            this.status.lastReadyAt &&
            Date.now() - this.status.lastReadyAt >= config.whatsapp.stableReadyWindow
        ) {
            this.status.reconnectCount = 0;
            this.logger.info("[MONITOR] Recovery counter reset after stable READY");
        }

        if (Date.now() - this.lastHealthLogAt >= config.internet.interval) {
            this.logger.info(`[MONITOR] Health check: OK (WhatsApp state: ${this.status.state})`);
            this.lastHealthLogAt = Date.now();
        }

        return true;
    }

    getStatus() {
        return this.status.ready && this.status.state === "CONNECTED";
    }

    stop() {
        this.stopped = true;
        this.status.reconnecting = false;
    }
}

export default WhatsAppGuardian;

