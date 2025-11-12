// prefs.js - Preferences UI for Simple Tiling extension

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SimpleTilingPreferences extends ExtensionPreferences {
    /**
     * Fill the preferences window with settings
     */
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.simple-tiling');

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Create a preferences group for keybindings
        const group = new Adw.PreferencesGroup({
            title: 'Keybindings',
            description: 'Configure keyboard shortcuts for Simple Tiling',
        });
        page.add(group);

        // Create a row for the toggle keybinding
        const row = new Adw.ActionRow({
            title: 'Toggle Tiling',
            subtitle: 'Enable or disable tiling for the current workspace',
        });
        group.add(row);

        // Create the keybinding button
        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: 'New accelerator…',
            valign: Gtk.Align.CENTER,
        });

        // Get current keybinding and display it
        const accelerators = settings.get_strv('toggle-tiling');
        if (accelerators.length > 0) {
            shortcutLabel.set_accelerator(accelerators[0]);
        }

        // Create button to trigger keybinding editor
        const button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            has_frame: false,
            child: shortcutLabel,
        });

        button.connect('clicked', () => {
            const dialog = new Gtk.Dialog({
                title: 'Set Keybinding',
                transient_for: window,
                modal: true,
                use_header_bar: true,
            });

            const content = dialog.get_content_area();
            const label = new Gtk.Label({
                label: 'Press any key combination to set the keybinding.\nPress Escape to cancel or Backspace to clear.',
                margin_top: 12,
                margin_bottom: 12,
                margin_start: 12,
                margin_end: 12,
            });
            content.append(label);

            const eventController = new Gtk.EventControllerKey();
            eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
                const mask = state & Gtk.accelerator_get_default_mod_mask();

                // Escape cancels
                if (keyval === 65307) { // Escape
                    dialog.close();
                    return true;
                }

                // Backspace clears the keybinding
                if (keyval === 65288) { // Backspace
                    settings.set_strv('toggle-tiling', []);
                    shortcutLabel.set_accelerator('');
                    dialog.close();
                    return true;
                }

                // Ignore modifier keys on their own
                if (keyval === 65505 || keyval === 65506 || // Shift
                    keyval === 65507 || keyval === 65508 || // Control
                    keyval === 65513 || keyval === 65514 || // Alt
                    keyval === 65515 || keyval === 65516) { // Super
                    return true;
                }

                // Build accelerator string
                const accelerator = Gtk.accelerator_name_with_keycode(
                    null,
                    keyval,
                    keycode,
                    mask
                );

                if (accelerator) {
                    settings.set_strv('toggle-tiling', [accelerator]);
                    shortcutLabel.set_accelerator(accelerator);
                }

                dialog.close();
                return true;
            });

            dialog.add_controller(eventController);
            dialog.present();
        });

        row.add_suffix(button);
        row.activatable_widget = button;
    }
}
