import {saveAs} from 'file-saver';
import {TwineElectronWindow} from '../electron/shared';

/**
 * Checks whether we're running in Electron and can use the native save
 * dialog.
 */
function getElectronBridge() {
	return (window as unknown as TwineElectronWindow).twineElectron;
}

/**
 * Saves text to an HTML file. If running inside Electron and a
 * `defaultSaveDirectory` is provided, a native save dialog is shown with
 * that directory pre-selected. Otherwise falls back to the browser download.
 */
export async function saveHtml(
	source: string,
	filename: string,
	defaultSaveDirectory?: string
) {
	const bridge = getElectronBridge();

	if (bridge?.showSaveFileDialog && defaultSaveDirectory) {
		await bridge.showSaveFileDialog(
			source,
			filename,
			defaultSaveDirectory
		);

		// Whether the user saved or cancelled, don't fall through to the
		// browser download.
		return;
	}

	const data = new Blob([source], {type: 'text/html;charset=utf-8'});

	saveAs(data, filename);
}

/**
 * Saves text to a Twee file. If running inside Electron and a
 * `defaultSaveDirectory` is provided, a native save dialog is shown with
 * that directory pre-selected.
 */
export async function saveTwee(
	source: string,
	filename: string,
	defaultSaveDirectory?: string
) {
	const bridge = getElectronBridge();

	if (bridge?.showSaveFileDialog && defaultSaveDirectory) {
		await bridge.showSaveFileDialog(
			source,
			filename,
			defaultSaveDirectory
		);

		// Whether the user saved or cancelled, don't fall through to the
		// browser download.
		return;
	}

	const data = new Blob([source], {type: 'text/plain;charset=utf-8'});

	saveAs(data, filename);
}
