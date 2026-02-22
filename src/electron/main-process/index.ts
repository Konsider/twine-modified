import {app, protocol} from 'electron';
import {initApp} from './init-app';
import {loadAppPrefs} from './app-prefs';
import {initHardwareAcceleration} from './hardware-acceleration';

// We need to load prefs here *and block* because disabling hardware
// acceleration has to happen before the app is ready.
// @see https://github.com/electron/electron/issues/21370

loadAppPrefs();
initHardwareAcceleration();

// Register the custom protocol for serving passage reference images.
// This must happen before app ready.

protocol.registerSchemesAsPrivileged([
	{
		scheme: 'twine-image',
		privileges: {
			secure: true,
			supportFetchAPI: true,
			bypassCSP: true
		}
	}
]);

// Continue initialization that needs to happen after Electron is ready.

app.whenReady().then(initApp);
app.on('window-all-closed', () => app.quit());
