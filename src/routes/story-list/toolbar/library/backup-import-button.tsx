import * as React from 'react';
import {IconFolder} from '@tabler/icons';
import {IconButton} from '../../../../components/control/icon-button';
import {
	importStories as importStoriesAction,
	Story,
	useStoriesContext
} from '../../../../store/stories';
import {importStories as parseHtmlStories} from '../../../../util/import';
import {storyFileName} from '../../../../electron/shared';
import {useStoriesRepair} from '../../../../store/use-stories-repair';

export const BackupImportButton: React.FC = () => {
	const {dispatch, stories: existingStories} = useStoriesContext();
	const repairStories = useStoriesRepair();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [busy, setBusy] = React.useState(false);

	async function handleFile(file: File) {
		if (busy) return;
		setBusy(true);

		try {
			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(file);

			const allStories: Story[] = [];

			// Extract every .html file in the zip and parse stories from it.
			const htmlFiles = Object.keys(zip.files).filter(
				name => /\.html$/i.test(name) && !zip.files[name].dir
			);

			for (const name of htmlFiles) {
				const html = await zip.files[name].async('string');

				try {
					const parsed = parseHtmlStories(html);
					allStories.push(...parsed);
				} catch {
					console.warn(`Could not parse stories from ${name}, skipping`);
				}
			}

			if (allStories.length === 0) {
				window.alert('No stories found in the zip file.');
				return;
			}

			// Check for conflicts.
			const conflicts = allStories.filter(story =>
				existingStories.some(
					existing => storyFileName(existing) === storyFileName(story)
				)
			);
			const nonConflicts = allStories.filter(
				story =>
					!existingStories.some(
						existing =>
							storyFileName(existing) === storyFileName(story)
					)
			);

			let toImport: Story[] = [...nonConflicts];

			if (conflicts.length > 0) {
				const conflictNames = conflicts
					.map(s => `  • ${s.name}`)
					.join('\n');

				const msg =
					`Found ${allStories.length} story(ies) in the backup.\n\n` +
					`${conflicts.length} conflict(s) with existing stories:\n` +
					`${conflictNames}\n\n` +
					`Click OK to overwrite conflicts, or Cancel to skip them ` +
					`(non-conflicting stories will still be imported).`;

				if (window.confirm(msg)) {
					toImport = allStories;
				}
			}

			if (toImport.length > 0) {
				dispatch(importStoriesAction(toImport, existingStories));
				repairStories();

				window.alert(
					`Successfully imported ${toImport.length} story(ies).`
				);
			} else {
				window.alert('No stories were imported.');
			}
		} catch (err) {
			console.error('Backup import failed', err);
			window.alert('Backup import failed. See console for details.');
		} finally {
			setBusy(false);
			// Reset the input so the same file can be re-selected.
			if (inputRef.current) {
				inputRef.current.value = '';
			}
		}
	}

	return (
		<>
			<IconButton
				icon={<IconFolder />}
				label="Restore from Backup (Zip)"
				onClick={() => inputRef.current?.click()}
				disabled={busy}
			/>
			<input
				ref={inputRef}
				type="file"
				accept=".zip"
				style={{display: 'none'}}
				onChange={e => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
				}}
			/>
		</>
	);
};
