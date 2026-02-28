import * as React from 'react';
import {useTranslation} from 'react-i18next';
import useErrorBoundary from 'use-error-boundary';
import {ErrorMessage} from '../../components/error';
import {passageWithId, storyWithId, updatePassage} from '../../store/stories';
import {
	formatWithNameAndVersion,
	useStoryFormatsContext
} from '../../store/story-formats';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {addPassageEditors, useDialogsContext} from '../context';
import {PassageText} from './passage-text';
import {PassageToolbar} from './passage-toolbar';
import {StoryFormatToolbar} from './story-format-toolbar';
import {PassageImagePanel} from './passage-image-panel';
import {isElectronRenderer} from '../../util/is-electron';
import {parseLinks} from '../../util/parse-links';
import './passage-edit-contents.css';
import {usePrefsContext} from '../../store/prefs';

export interface PassageEditContentsProps {
	disabled?: boolean;
	passageId: string;
	storyId: string;
}

export const PassageEditContents: React.FC<
	PassageEditContentsProps
> = props => {
	const {disabled, passageId, storyId} = props;
	const [storyFormatExtensionsEnabled, setStoryFormatExtensionsEnabled] =
		React.useState(true);
	const [editorCrashed, setEditorCrashed] = React.useState(false);
	const [cmEditor, setCmEditor] = React.useState<CodeMirror.Editor>();
	const {ErrorBoundary, error, reset: resetError} = useErrorBoundary();
	const {prefs} = usePrefsContext();
	const {dispatch, stories} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const {formats} = useStoryFormatsContext();
	const passage = passageWithId(stories, storyId, passageId);
	const story = storyWithId(stories, storyId);
	const storyFormat = formatWithNameAndVersion(
		formats,
		story.storyFormat,
		story.storyFormatVersion
	);
	const {t} = useTranslation();

	React.useEffect(() => {
		if (error) {
			if (storyFormatExtensionsEnabled) {
				console.error(
					'Passage editor crashed, trying without format extensions',
					error
				);
				setStoryFormatExtensionsEnabled(false);
			} else {
				setEditorCrashed(true);
			}

			resetError();
		}
	}, [error, resetError, storyFormatExtensionsEnabled]);

	const handlePassageTextChange = React.useCallback(
		(text: string) => {
			dispatch(updatePassage(story, passage, {text}));
		},
		[dispatch, passage, story]
	);

	function handleExecCommand(name: string) {
		// A format toolbar command probably will affect the editor content. It
		// appears that react-codemirror2 can't maintain the selection properly in
		// all cases when this happens (particularly when using
		// `replaceSelection('something', 'around')`), so we take a snapshot
		// immediately after the command runs, let react-codemirror2 work, then
		// reapply the selection ASAP.

		if (!cmEditor) {
			throw new Error('No editor set');
		}

		cmEditor.execCommand(name);

		const selections = cmEditor.listSelections();

		Promise.resolve().then(() => cmEditor.setSelections(selections));
	}

	if (editorCrashed) {
		return (
			<ErrorMessage>{t('dialogs.passageEdit.editorCrashed')}</ErrorMessage>
		);
	}

	// Count words in the passage text. Split on whitespace and filter out
	// empty strings so that leading/trailing whitespace and multiple spaces
	// don't inflate the count.
	const wordCount = passage.text.trim() === ''
		? 0
		: passage.text.trim().split(/\s+/).length;

	// Check if this passage has outgoing links (used for End toggle validation).
	const outgoingLinks = parseLinks(passage.text, true);
	const hasOutgoingLinks = outgoingLinks.length > 0;

	// Ctrl+click link to jump to target passage.
	const handleOpenPassage = React.useCallback(
		(passageName: string) => {
			const target = story.passages.find(p => p.name === passageName);
			if (target) {
				dialogsDispatch(addPassageEditors(storyId, [target.id]));
			}
		},
		[dialogsDispatch, story.passages, storyId]
	);

	const handleToggleEnd = React.useCallback(() => {
		if (!passage.end && hasOutgoingLinks) {
			// Don't allow marking as end if there are outgoing links.
			return;
		}
		dispatch(updatePassage(story, passage, {end: !passage.end, ...(!passage.end ? {hub: false} : {})}));
	}, [dispatch, passage, story, hasOutgoingLinks]);

	const handleToggleHub = React.useCallback(() => {
		if (passage.end) {
			// Can't be a hub if it's an end.
			return;
		}
		dispatch(updatePassage(story, passage, {hub: !passage.hub}));
	}, [dispatch, passage, story]);

	// When spell check is on, the passage editor uses a plain textarea
	// instead of CodeMirror, so hide the CodeMirror-specific toolbars.
	const useCodeMirrorForPassage =
		prefs.useCodeMirror && !prefs.spellCheckInPassageEditor;

	return (
		<div className="passage-edit-contents" aria-hidden={disabled}>
			<div className="passage-edit-toolbar-row">
				<PassageToolbar
					disabled={disabled}
					editor={cmEditor}
					passage={passage}
					story={story}
					useCodeMirror={useCodeMirrorForPassage}
				/>
				{isElectronRenderer() && (
					<PassageImagePanel passage={passage} story={story} />
				)}
			</div>
			{useCodeMirrorForPassage && storyFormatExtensionsEnabled && (
				<StoryFormatToolbar
					disabled={disabled}
					editor={cmEditor}
					onExecCommand={handleExecCommand}
					storyFormat={storyFormat}
				/>
			)}
			<ErrorBoundary>
				<div className="passage-edit-body">
					<PassageText
						disabled={disabled}
						onChange={handlePassageTextChange}
						onEditorChange={setCmEditor}
						onOpenPassage={handleOpenPassage}
						passage={passage}
						story={story}
						storyFormat={storyFormat}
						storyFormatExtensionsDisabled={!storyFormatExtensionsEnabled}
					/>
				</div>
			</ErrorBoundary>
			<div className="passage-edit-status-bar">
				{passage.tags.length > 0 && (
					<div className="passage-edit-tags">
						{passage.tags.map(tag => (
							<span
								key={tag}
								className={`passage-edit-tag color-${story.tagColors[tag] || 'none'}`}
							>
								{tag}
							</span>
						))}
					</div>
				)}
				<div className="passage-edit-status-right">
					<button
						className={`passage-edit-hub-toggle ${passage.hub ? 'is-hub' : ''}`}
						onClick={handleToggleHub}
						disabled={passage.end}
						title={
							passage.end
								? t('dialogs.passageEdit.hubIsEnd')
								: passage.hub
									? t('dialogs.passageEdit.hubEnabled')
									: t('dialogs.passageEdit.hubDisabled')
						}
					>
						{passage.hub ? '✓ ' : ''}{t('dialogs.passageEdit.hubLabel')}
					</button>
					<button
						className={`passage-edit-end-toggle ${passage.end ? 'is-end' : ''}`}
						onClick={handleToggleEnd}
						disabled={!passage.end && hasOutgoingLinks}
						title={
							!passage.end && hasOutgoingLinks
								? t('dialogs.passageEdit.endHasLinks')
								: passage.end
									? t('dialogs.passageEdit.endEnabled')
									: t('dialogs.passageEdit.endDisabled')
						}
					>
						{passage.end ? '✓ ' : ''}{t('dialogs.passageEdit.endLabel')}
					</button>
					<div className="passage-edit-word-count">
						{t('dialogs.passageEdit.wordCount', {count: wordCount})}
					</div>
				</div>
			</div>
		</div>
	);
};
