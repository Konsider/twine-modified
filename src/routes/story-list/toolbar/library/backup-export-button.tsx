import * as React from 'react';
import {IconDeviceFloppy} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {useStoriesContext} from '../../../../store/stories';
import {usePrefsContext} from '../../../../store/prefs';
import {publishStory} from '../../../../util/publish';
import {getAppInfo} from '../../../../util/app-info';
import {TwineElectronWindow} from '../../../../electron/shared';
import {saveAs} from 'file-saver';

export const BackupExportButton: React.FC = () => {
	const {stories} = useStoriesContext();
	const {prefs} = usePrefsContext();
	const [busy, setBusy] = React.useState(false);

	async function handleClick() {
		if (stories.length === 0 || busy) return;

		setBusy(true);

		try {
			// Dynamically import JSZip to keep initial bundle lighter.
			const JSZip = (await import('jszip')).default;
			const zip = new JSZip();
			const appInfo = getAppInfo();

			for (const story of stories) {
				const html = publishStory(story, appInfo, {startOptional: true});
				// Sanitise story name for filename.
				const safeName = story.name.replace(/[<>:"/\\|?*]+/g, '_');

				zip.file(`${safeName}.html`, html);
			}

			const date = new Date()
				.toISOString()
				.replace(/T/, '-')
				.replace(/[:.]/g, '')
				.slice(0, 15);
			const filename = `twine-backup-${date}.zip`;

			const bridge = (window as unknown as TwineElectronWindow)
				.twineElectron;

			if (bridge?.showSaveBinaryDialog && prefs.defaultSaveDirectory) {
				const blob = await zip.generateAsync({type: 'blob'});
				const buf = new Uint8Array(await blob.arrayBuffer());

				await bridge.showSaveBinaryDialog(
					buf,
					filename,
					prefs.defaultSaveDirectory
				);
			} else {
				const blob = await zip.generateAsync({type: 'blob'});

				saveAs(blob, filename);
			}
		} catch (err) {
			console.error('Backup export failed', err);
			window.alert('Backup export failed. See console for details.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<IconButton
			icon={<IconDeviceFloppy />}
			label="Backup All Stories (Zip)"
			onClick={handleClick}
			disabled={stories.length === 0 || busy}
		/>
	);
};
