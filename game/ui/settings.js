// Settings: one panel, from anywhere, over whatever is showing.
//
// It opens from the title screen's button and, in the air, from Escape - which still closes an
// open card first, because closing the card is what Escape has always meant with a card open and
// a setting nobody asked for is worse than a setting one keypress further away.
//
// Four things live here: how loud, which language, whether the help card comes back, and the way
// out of a flight. The sound is only here now - there was a second button for it up on the HUD
// and two switches for one thing is one too many.
//
// The way out asks first, because a flight is not saved anywhere and leaving one is leaving it.
// It asks in the game's own furniture rather than with window.confirm: a page inside an app or
// inside the itch frame may have that quietly disabled, and then it returns false without ever
// drawing anything, which is how a button comes to do nothing at all.
//
// The language is offered at the title and in the air, and changing it in the air is allowed: the
// cabin, the cards and the tooltips redraw in the new language immediately. What does not change
// is the lines already in the log, because those were written at the time, in the language they
// were written in, and rewriting somebody's flight underneath them would be a strange thing to
// do to a record.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, clear, store } = PRS.util;
    const T = PRS.t;

    let veil = null;
    let onKey = null;
    let asking = 0;               // questions open over the panel; Escape belongs to the last one

    function isOpen() { return !!(veil && veil.isConnected); }

    /**
     * Open it over `root`. `onChange` is called after anything that the screen underneath has to
     * redraw for; the play screen repaints, the title rebuilds itself.
     */
    function open(root, onChange) {
        if (!root || isOpen()) return;
        PRS.audio.unlock();
        const changed = onChange || function () {};

        veil = el("div", {
            class: "settings-veil",
            onclick: (ev) => { if (ev.target === veil) close(); },
        }, [
            el("div", { class: "settings" }, [
                el("h3", { text: T("Settings") }),
                soundRow(),
                languageRow(changed),
                helpRow(root),
                quitRow(),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: T("Close"), onclick: close }),
                ]),
                el("p", { class: "footnote", text: T("Escape closes this. M mutes.") }),
            ]),
        ]);
        root.appendChild(veil);

        onKey = function (ev) {
            if (ev.key !== "Escape" || asking) return;
            // The play screen listens for Escape on this same node, and stopPropagation does
            // not stop a listener on the node the event is already at. So the key is marked
            // instead, and everyone else's handler steps over a key that has been dealt with.
            ev.prsHandled = true;
            close();
        };
        // Captured, so this runs before the screen behind the panel gets a look at the key.
        document.addEventListener("keydown", onKey, true);
    }

    function close() {
        if (onKey) document.removeEventListener("keydown", onKey, true);
        onKey = null;
        if (veil) veil.remove();
        veil = null;
    }

    // ------------------------------------------------------------------------------- sound ---

    function soundRow() {
        const A = PRS.audio;
        const value = el("b", { class: "set-value" });
        const slider = el("input", {
            type: "range", min: "0", max: "100", step: "5",
            value: String(Math.round(A.getVolume() * 100)),
            class: "set-slider",
        });
        const toggle = el("button", { class: "set-toggle" });

        function paint() {
            const on = A.isEnabled();
            value.textContent = on ? Math.round(A.getVolume() * 100) + "%" : T("muted");
            toggle.textContent = on ? T("Mute") : T("Unmute");
            toggle.className = "set-toggle" + (on ? "" : " off");
            slider.disabled = !on;
        }

        slider.addEventListener("input", function () {
            A.setVolume(Number(slider.value) / 100);
            store.set("volume", A.getVolume());
            paint();
        });
        // One blip on release, so you can hear what you have chosen without a blip per pixel.
        slider.addEventListener("change", function () { A.play("select"); });
        slider.addEventListener("keydown", (ev) => ev.stopPropagation());

        toggle.addEventListener("click", function () {
            A.setEnabled(!A.isEnabled());
            store.set("sound", A.isEnabled());
            if (A.isEnabled()) { A.startRoar(); A.play("select"); }
            paint();
        });

        paint();
        return el("div", { class: "set-row" }, [
            el("div", { class: "set-head" }, [el("span", { text: T("Sound") }), value]),
            el("div", { class: "set-control" }, [slider, toggle]),
        ]);
    }

    // ---------------------------------------------------------------------------- language ---

    function languageRow(changed) {
        const I = PRS.i18n;
        const row = el("div", { class: "langs" });
        const paint = function () {
            clear(row);
            const now = I.lang();
            for (const l of I.LANGS) {
                row.appendChild(el("button", {
                    class: "lang" + (l.code === now ? " on" : ""),
                    lang: l.code,
                    text: l.self,
                    onclick: l.code === now ? null : function () {
                        PRS.audio.play("blip");
                        I.setLang(l.code);
                        repaint(changed);
                    },
                }));
            }
        };
        paint();
        return el("div", { class: "set-row" }, [
            el("div", { class: "set-head" }, [el("span", { text: T("Language") })]),
            row,
        ]);
    }

    /** The panel says everything twice, so a language change has to redraw the panel too. */
    function repaint(changed) {
        const root = veil && veil.parentNode;
        close();
        changed();
        if (root) open(root, changed);
    }

    // -------------------------------------------------------------------------------- help ---

    function helpRow(root) {
        return el("div", { class: "set-row" }, [
            el("div", { class: "set-head" }, [el("span", { text: T("Help") })]),
            el("div", { class: "set-control" }, [
                el("button", { class: "set-toggle", text: T("Show how to play"),
                               onclick: function () {
                                   const ch = (PRS.current && PRS.current.character) ||
                                              PRS.data.characters.CHARACTERS[0];
                                   close();
                                   PRS.screens.help(root, ch);
                               } }),
            ]),
        ]);
    }

    // -------------------------------------------------------------------------------- quit ---

    /**
     * The way out, offered only while there is a flight to leave. On the title screen there is
     * nothing to quit and no window this game is allowed to close, so the row is not there.
     */
    function quitRow() {
        if (!(PRS.play && PRS.play.aloft && PRS.play.aloft())) return null;
        return el("div", { class: "set-row" }, [
            el("div", { class: "set-head" }, [el("span", { text: T("This flight") })]),
            el("div", { class: "set-control" }, [
                el("button", { class: "set-toggle leave", text: T("Quit the flight"),
                               onclick: askQuit }),
            ]),
        ]);
    }

    function askQuit() {
        ask({
            title: T("Leave the aeroplane?"),
            body: T("A flight is not saved. Where everyone is, what is in your arms, the " +
                    "seconds you have left - all of it goes, and an unfinished flight is " +
                    "written nowhere in the log book."),
            yes: T("Leave the flight"),
            onYes: function () {
                close();
                PRS.audio.stopRoar();
                PRS.screens.title();
            },
        });
    }

    // -------------------------------------------------------------------------- a question ---

    /**
     * One question, two answers, over everything else. `q` is { title, body, yes, onYes }, and
     * the answer that changes something is the one on the right and the one you have to reach
     * for: Escape, the veil and the other button all mean no.
     *
     * This exists instead of window.confirm because window.confirm is not always allowed to
     * open - inside the itch frame, or a desktop app's own browser - and when it is not, it
     * answers false without asking anybody, which turns the button that called it into a button
     * that does nothing.
     */
    function ask(q) {
        let node = null;
        let key = null;

        function shut() {
            if (key) document.removeEventListener("keydown", key, true);
            key = null;
            if (node) node.remove();
            node = null;
            asking = Math.max(0, asking - 1);
        }
        function no() { PRS.audio.play("blip"); shut(); }
        function yes() { shut(); q.onYes(); }

        const go = el("button", { class: "big warn", text: q.yes, onclick: yes });
        const stay = el("button", { text: T("Cancel"), onclick: no });
        node = el("div", {
            class: "settings-veil ask-veil",
            onclick: (ev) => { if (ev.target === node) no(); },
        }, [
            el("div", { class: "settings ask" }, [
                el("h3", { text: q.title }),
                el("p", { text: q.body }),
                el("div", { class: "title-buttons" }, [stay, go]),
            ]),
        ]);
        document.body.appendChild(node);
        asking++;
        // Nothing is answered by leaning on the keyboard: the button under the cursor when this
        // opened is not focused, and Escape means no.
        stay.focus();
        key = function (ev) {
            // Nothing behind a question is listening: the aeroplane does not take instructions
            // while it is being asked something, and Escape is the question's own.
            ev.prsHandled = true;
            if (ev.key !== "Escape") return;
            ev.stopPropagation();
            no();
        };
        document.addEventListener("keydown", key, true);
    }

    PRS.settings = { open, close, isOpen, ask };
})(window);
