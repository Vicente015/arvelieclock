/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { panel } from "resource:///org/gnome/shell/ui/main.js";
//import GLib from '@girs/glib-2.0';
import GLib from "gi://GLib";
import Gio from "gi://Gio";

export default class ArvelieClock extends Extension {
    enable () {
        const dateMenu = panel.statusArea.dateMenu;

        const clockDisplayBox = dateMenu
            .get_children()
            .find((x) => x.style_class === "clock-display-box");

        this.label = clockDisplayBox?.get_children().find(
            (x) =>
                x.style_class === "clock" && x.text?.includes("\u2236")
        );

        if (!this.label) {
            console.error("No clock label? Aborting.");
            return;
        }

        const gnomeSettings = Gio.Settings.new("org.gnome.desktop.interface");

        function neralie (date, showPulse) {
            const startOfDay = GLib.DateTime.new_local(date.get_year(), date.get_month(), date.get_day_of_month(), 0, 0, 0.0)
            const ms = date.difference(startOfDay) / 1000
            const val = (ms / 8640 / 10000).toFixed(6)
            const beat = val.substr(2, 3)
            const pulse = val.substr(5, 3)
            return showPulse ? `${beat}:${pulse}` : `${beat}`
        }

        const arvelie = (date) => {
            const dayOfYear = date.get_day_of_year() - 1 // to index 0

            const fullYearStr = date.get_year().toString()
            const y =
                fullYearStr.slice(0, 2) === '20' ? fullYearStr.slice(2) : fullYearStr

            const isYearDay = date.get_day_of_year() === 365
            const isLeapDay = date.get_day_of_year() === 366

            if (isYearDay) {
                return y + '+00' // year day
            }

            if (isLeapDay) {
                return y + '+01' // leap day
            }

            const m = String.fromCharCode(65 + Math.floor(dayOfYear / 14))
            const d = String(dayOfYear % 14).padStart(2, '0')

            return y + m + d
        }

        const override = () => {
            const now = GLib.DateTime.new_now_local();
            // getting the clock settings
            const d = gnomeSettings.get_boolean("clock-show-date");
            const s = gnomeSettings.get_boolean("clock-show-seconds");

            this.newClock = d
                ? `${arvelie(now)} ${neralie(now, s)}`
                : `${neralie(now, s)}`

            // Don't do anything if the clock label hasn't actually changed
            if (this.newClock == this.label.get_text()) {
                return;
            }
            this.defaultClock = this.label.get_text();
            this.label.set_text(this.newClock);
            return true
        };

        this.handlerid = this.label.connect("notify::text", override);
        override();
    }

    disable () {
        if (this.handlerid) {
            this.label.disconnect(this.handlerid);
            this.handlerid = null;

            this.label.set_text(this.defaultClock);
            this.label = null;

            this.newClock = null;
            this.defaultClock = null;
        }
    }
}
