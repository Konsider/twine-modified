import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {DialogEditor} from '../../components/container/dialog-card';
import {CodeArea} from '../../components/control/code-area';
import {usePrefsContext} from '../../store/prefs';
import {Passage, Story} from '../../store/stories';
import {StoryFormat} from '../../store/story-formats';
import {useCodeMirrorPassageHints} from '../../store/use-codemirror-passage-hints';
import {useFormatCodeMirrorMode} from '../../store/use-format-codemirror-mode';
import {codeMirrorOptionsFromPrefs} from '../../util/codemirror-options';
import {PassageContextMenu} from './passage-context-menu';
import {TextareaLinkAutocomplete} from './textarea-link-autocomplete';
import {parseLinks, resolveLink} from '../../util/parse-links';

export interface PassageTextProps {
	disabled?: boolean;
	onChange: (value: string) => void;
	onEditorChange: (value: CodeMirror.Editor) => void;
	onOpenPassage?: (passageName: string) => void;
	passage: Passage;
	story: Story;
	storyFormat: StoryFormat;
	storyFormatExtensionsDisabled?: boolean;
}

export const PassageText: React.FC<PassageTextProps> = props => {
	const {
		disabled,
		onChange,
		onEditorChange,
		onOpenPassage,
		passage,
		story,
		storyFormat,
		storyFormatExtensionsDisabled
	} = props;
	const [localText, setLocalText] = React.useState(passage.text);
	const {prefs} = usePrefsContext();
	const autocompletePassageNames = useCodeMirrorPassageHints(story);
	const mode =
		useFormatCodeMirrorMode(storyFormat.name, storyFormat.version) ?? 'text';
	const codeAreaContainerRef = React.useRef<HTMLDivElement>(null);
	const editorRef = React.useRef<CodeMirror.Editor>();
	const brokenMarksRef = React.useRef<CodeMirror.TextMarker[]>([]);
	const onOpenPassageRef = React.useRef(onOpenPassage);
	onOpenPassageRef.current = onOpenPassage;
	const storyRef = React.useRef(story);
	storyRef.current = story;
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const {t} = useTranslation();

	// Context menu state.
	const [contextMenu, setContextMenu] = React.useState<{
		x: number;
		y: number;
	} | null>(null);

	// These are refs so that changing them doesn't trigger a rerender, and more
	// importantly, no React effects fire.

	const onChangeText = React.useRef<string>();
	const onChangeTimeout = React.useRef<number>();

	// Effects to handle debouncing updates upward. The idea here is that the
	// component maintains a local state so that the CodeMirror instance always is
	// up-to-date with what the user has typed, but the global context may not be.
	// This is because updating global context causes re-rendering in the story
	// map, which can be time-intensive.

	React.useEffect(() => {
		// A change to passage text has occurred externally, e.g. through a find and
		// replace. We ignore this if a change is pending so that users don't see
		// things they've typed in disappear or be replaced.

		if (!onChangeTimeout.current && localText !== passage.text) {
			setLocalText(passage.text);
		}
	}, [localText, passage.text]);

	const handleLocalChangeText = React.useCallback(
		(text: string) => {
			// Set local state because the CodeMirror instance is controlled, and
			// updates there should be immediate.

			setLocalText(text);

			// If there was a pending update, cancel it.

			if (onChangeTimeout.current) {
				window.clearTimeout(onChangeTimeout.current);
			}

			// Save the text value in case we need to reset the timeout in the next
			// effect.

			onChangeText.current = text;

			// Queue a call to onChange.

			onChangeTimeout.current = window.setTimeout(() => {
				// Important to reset this ref so that we don't try to cancel fired
				// timeouts above.

				onChangeTimeout.current = undefined;

				// Finally call the onChange prop.

				onChange(onChangeText.current!);
			}, 1000);
		},
		[onChange]
	);

	// If the onChange prop changes while an onChange call is pending, reset the
	// timeout and point it to the correct callback.

	React.useEffect(() => {
		if (onChangeTimeout.current) {
			window.clearTimeout(onChangeTimeout.current);
			onChangeTimeout.current = window.setTimeout(() => {
				// This body must be the same as in the timeout in the previous effect.

				onChangeTimeout.current = undefined;
				onChange(onChangeText.current!);
			}, 1000);
		}
	}, [onChange]);

	// When spell check is enabled, force a plain textarea so the browser
	// can show red underlines. CodeMirror hides its textarea making
	// native spellcheck impossible.
	const useCodeMirrorForPassage =
		prefs.useCodeMirror && !prefs.spellCheckInPassageEditor;

	// Emulate the above behavior re: focus if we aren't using CodeMirror.

	React.useEffect(() => {
		if (!useCodeMirrorForPassage && codeAreaContainerRef.current) {
			const area = codeAreaContainerRef.current.querySelector('textarea');

			if (!area) {
				return;
			}

			(textareaRef as React.MutableRefObject<HTMLTextAreaElement>).current = area;
			area.focus();
			area.setSelectionRange(area.value.length, area.value.length);
		}
	}, []);

	const options = React.useMemo(
		() => ({
			...codeMirrorOptionsFromPrefs(prefs),
			mode: storyFormatExtensionsDisabled ? 'text' : mode,
			lineWrapping: true,
			placeholder: t('dialogs.passageEdit.passageTextPlaceholder'),
			prefixTrigger: {
				callback: autocompletePassageNames,
				prefixes: ['[[', '->']
			},
			// This value prevents the area from being focused.
			readOnly: disabled ? 'nocursor' : false
		}),
		[
			autocompletePassageNames,
			disabled,
			mode,
			prefs,
			storyFormatExtensionsDisabled,
			t
		]
	);

	// Mark broken links in the CodeMirror editor.
	// Runs whenever the local text or passage list changes.

	React.useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;

		// Clear previous marks.
		for (const m of brokenMarksRef.current) m.clear();
		brokenMarksRef.current = [];

		const passageNames = new Set(story.passages.map(p => p.name));
		const text = editor.getValue();
		const linkPattern = /\[\[(.*?)\]\]/g;
		let match;

		while ((match = linkPattern.exec(text)) !== null) {
			const inner = match[1];
			const target = resolveLink(inner);

			if (target && !passageNames.has(target)) {
				const startPos = editor.posFromIndex(match.index);
				const endPos = editor.posFromIndex(match.index + match[0].length);

				brokenMarksRef.current.push(
					editor.markText(startPos, endPos, {
						className: 'cm-broken-link',
						title: `"${target}" does not exist`
					})
				);
			}
		}
	}, [localText, story.passages]);

	const handleMount = React.useCallback(
		(editor: CodeMirror.Editor) => {
			onEditorChange(editor);
			editorRef.current = editor;

			// Attach the right-click context menu handler.
			const wrapper = editor.getWrapperElement();

			wrapper.addEventListener('contextmenu', (e: MouseEvent) => {
				e.preventDefault();
				setContextMenu({x: e.clientX, y: e.clientY});
			});

			// Ctrl+click (or Cmd+click) on a link to jump to that passage.
			wrapper.addEventListener('click', (e: MouseEvent) => {
				if (!(e.ctrlKey || e.metaKey)) return;

				const pos = editor.coordsChar({left: e.clientX, top: e.clientY});
				const lineText = editor.getLine(pos.line);
				if (!lineText) return;

				// Find which [[...]] bracket pair the click fell inside.
				const linkPattern = /\[\[(.*?)\]\]/g;
				let match;
				while ((match = linkPattern.exec(lineText)) !== null) {
					const start = match.index;
					const end = start + match[0].length;
					if (pos.ch >= start && pos.ch <= end) {
						const inner = match[1];
						const target = resolveLink(inner);

						if (target && storyRef.current.passages.some(p => p.name === target)) {
							e.preventDefault();
							onOpenPassageRef.current?.(target);
						}
						break;
					}
				}
			});

			// Enable spellcheck on the contenteditable div that CodeMirror
			// creates when inputStyle is 'contenteditable'.
			const ceDiv = wrapper.querySelector<HTMLElement>(
				'[contenteditable="true"]'
			);

			if (ceDiv) {
				ceDiv.setAttribute('spellcheck', 'true');
			}

			// Also set on any textarea fallback.
			const textarea = wrapper.querySelector('textarea');

			if (textarea) {
				textarea.setAttribute('spellcheck', 'true');
			}

			// The potential combination of loading a mode and the dialog entrance
			// animation seems to mess up CodeMirror's cursor rendering. The delay below
			// is intended to run after the animation completes.

			window.setTimeout(() => {
				editor.focus();
				editor.refresh();
			}, 400);
		},
		[onEditorChange]
	);

	// -- Context menu action handlers --
	// These work with either CodeMirror (editorRef) or the plain textarea.

	function getTextarea(): HTMLTextAreaElement | null {
		return codeAreaContainerRef.current?.querySelector(
			'textarea.visible'
		) as HTMLTextAreaElement | null;
	}

	const handleCut = React.useCallback(() => {
		const editor = editorRef.current;

		if (editor) {
			const selection = editor.getSelection();

			if (selection) {
				navigator.clipboard.writeText(selection);
				editor.replaceSelection('');
			}

			return;
		}

		const ta = getTextarea();

		if (ta) {
			const selection = ta.value.substring(ta.selectionStart, ta.selectionEnd);

			if (selection) {
				navigator.clipboard.writeText(selection);
				const before = ta.value.substring(0, ta.selectionStart);
				const after = ta.value.substring(ta.selectionEnd);

				handleLocalChangeText(before + after);
			}
		}
	}, [handleLocalChangeText]);

	const handleCopy = React.useCallback(() => {
		const editor = editorRef.current;

		if (editor) {
			const selection = editor.getSelection();

			if (selection) {
				navigator.clipboard.writeText(selection);
			}

			return;
		}

		const ta = getTextarea();

		if (ta) {
			const selection = ta.value.substring(ta.selectionStart, ta.selectionEnd);

			if (selection) {
				navigator.clipboard.writeText(selection);
			}
		}
	}, []);

	const handlePaste = React.useCallback(() => {
		const editor = editorRef.current;

		if (editor) {
			navigator.clipboard.readText().then(text => {
				if (text) {
					editor.replaceSelection(text);
				}
			});

			return;
		}

		const ta = getTextarea();

		if (ta) {
			navigator.clipboard.readText().then(text => {
				if (text) {
					const before = ta.value.substring(0, ta.selectionStart);
					const after = ta.value.substring(ta.selectionEnd);

					handleLocalChangeText(before + text + after);
				}
			});
		}
	}, [handleLocalChangeText]);

	const handleMakeLink = React.useCallback(() => {
		const editor = editorRef.current;

		if (editor) {
			const selection = editor.getSelection();

			if (selection) {
				editor.replaceSelection(`[[${selection}]]`);
			}

			return;
		}

		const ta = getTextarea();

		if (ta) {
			const selection = ta.value.substring(ta.selectionStart, ta.selectionEnd);

			if (selection) {
				const before = ta.value.substring(0, ta.selectionStart);
				const after = ta.value.substring(ta.selectionEnd);

				handleLocalChangeText(before + `[[${selection}]]` + after);
			}
		}
	}, [handleLocalChangeText]);

	const hasSelection = React.useMemo(() => {
		const editor = editorRef.current;

		if (editor) {
			return editor.getSelection().length > 0;
		}

		const ta = getTextarea();

		if (ta) {
			return ta.selectionStart !== ta.selectionEnd;
		}

		return false;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contextMenu]);

	// Also handle right-click on the fallback textarea.
	React.useEffect(() => {
		if (useCodeMirrorForPassage || !codeAreaContainerRef.current) {
			return;
		}

		const area = codeAreaContainerRef.current.querySelector('textarea');

		if (!area) {
			return;
		}

		function handleContextMenu(e: MouseEvent) {
			e.preventDefault();
			setContextMenu({x: e.clientX, y: e.clientY});
		}

		area.addEventListener('contextmenu', handleContextMenu);

		return () => {
			area.removeEventListener('contextmenu', handleContextMenu);
		};
	}, [useCodeMirrorForPassage]);

	const handleAutocompleteInsert = React.useCallback(
		(before: string, inserted: string, after: string) => {
			handleLocalChangeText(before + inserted + after);
		},
		[handleLocalChangeText]
	);

	return (
		<DialogEditor ref={codeAreaContainerRef}>
			<CodeArea
				editorDidMount={handleMount}
				fontFamily={prefs.passageEditorFontFamily}
				fontScale={prefs.passageEditorFontScale}
				id={`passage-dialog-passage-text-code-area-${passage.id}`}
				label={t('dialogs.passageEdit.passageTextEditorLabel')}
				labelHidden
				onChangeEditor={onEditorChange}
				onChangeText={handleLocalChangeText}
				options={options}
				useCodeMirror={useCodeMirrorForPassage}
				value={localText}
			/>
			{!useCodeMirrorForPassage && (
				<TextareaLinkAutocomplete
					story={story}
					textareaRef={textareaRef}
					onInsert={handleAutocompleteInsert}
				/>
			)}
			{contextMenu && (
				<PassageContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					hasSelection={hasSelection}
					onCut={handleCut}
					onCopy={handleCopy}
					onPaste={handlePaste}
					onMakeLink={handleMakeLink}
					onClose={() => setContextMenu(null)}
				/>
			)}
		</DialogEditor>
	);
};
