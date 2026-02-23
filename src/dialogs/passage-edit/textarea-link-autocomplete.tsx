import * as React from 'react';
import {Story} from '../../store/stories';
import './textarea-link-autocomplete.css';

export interface TextareaLinkAutocompleteProps {
	story: Story;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	onInsert: (before: string, inserted: string, after: string) => void;
}

/**
 * Watches a plain <textarea> for `[[` and shows a dropdown of passage
 * names. Selecting one inserts the name and closing `]]`.
 */
export const TextareaLinkAutocomplete: React.FC<TextareaLinkAutocompleteProps> =
	({story, textareaRef, onInsert}) => {
		const [open, setOpen] = React.useState(false);
		const [filter, setFilter] = React.useState('');
		const [position, setPosition] = React.useState({top: 0, left: 0});
		const [selectedIndex, setSelectedIndex] = React.useState(0);
		// Track where the `[[` prefix starts so we can replace correctly.
		const prefixStartRef = React.useRef(0);
		const listRef = React.useRef<HTMLDivElement>(null);
		// Set to true while a mousedown on a dropdown item is in progress,
		// so the blur handler knows not to close the dropdown.
		const clickingItemRef = React.useRef(false);

		// Refs that mirror state so event handlers can read the latest
		// values without being re-attached on every change.
		const openRef = React.useRef(open);
		const matchesRef = React.useRef<string[]>([]);
		const selectedIndexRef = React.useRef(0);

		const matches = React.useMemo(() => {
			const lower = filter.toLowerCase();

			return story.passages
				.map(p => p.name)
				.filter(name => name.toLowerCase().includes(lower))
				.sort((a, b) => {
					// Prefer starts-with matches.
					const aStarts = a.toLowerCase().startsWith(lower) ? 0 : 1;
					const bStarts = b.toLowerCase().startsWith(lower) ? 0 : 1;

					return aStarts - bStarts || a.localeCompare(b);
				})
				.slice(0, 12);
		}, [filter, story.passages]);

		// Keep refs in sync with state.
		openRef.current = open;
		matchesRef.current = matches;
		selectedIndexRef.current = selectedIndex;

		const insertMatch = React.useCallback(
			(name: string) => {
				const ta = textareaRef.current;

				if (!ta) return;

				const before = ta.value.substring(0, prefixStartRef.current);
				const after = ta.value.substring(ta.selectionStart);

				onInsert(before, `[[${name}]]`, after);
				setOpen(false);

				// Refocus textarea after insert.
				requestAnimationFrame(() => {
					ta.focus();
					const pos = before.length + name.length + 4; // [[ + name + ]]
					ta.setSelectionRange(pos, pos);
				});
			},
			[onInsert, textareaRef]
		);

		const insertMatchRef = React.useRef(insertMatch);
		insertMatchRef.current = insertMatch;

		// Attach event listeners once per textarea; handlers read refs.
		React.useEffect(() => {
			const ta = textareaRef.current;

			if (!ta) return;

			function handleInput() {
				if (!ta) return;

				const pos = ta.selectionStart;
				const text = ta.value;

				// Look backwards for `[[`.
				const before = text.substring(0, pos);
				const bracketIdx = before.lastIndexOf('[[');

				if (bracketIdx === -1 || before.indexOf(']]', bracketIdx) !== -1) {
					// No open `[[` or it's already been closed.
					if (openRef.current) setOpen(false);
					return;
				}

				const typed = before.substring(bracketIdx + 2);

				// Don't show if there's a newline in the typed portion.
				if (typed.includes('\n')) {
					if (openRef.current) setOpen(false);
					return;
				}

				prefixStartRef.current = bracketIdx;
				setFilter(typed);
				setSelectedIndex(0);

				// Position the dropdown near the cursor.
				// Use a rough approximation based on textarea scroll and font metrics.
				const rect = ta.getBoundingClientRect();
				// Estimate line from character position.
				const linesBefore = before.split('\n');
				const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
				const approxTop =
					rect.top +
					linesBefore.length * lineHeight -
					ta.scrollTop +
					4;
				const approxLeft = rect.left + 40;

				setPosition({top: approxTop, left: approxLeft});
				setOpen(true);
			}

			function handleKeyDown(e: KeyboardEvent) {
				if (!openRef.current) return;

				const m = matchesRef.current;

				if (e.key === 'ArrowDown') {
					e.preventDefault();
					setSelectedIndex(i => Math.min(i + 1, m.length - 1));
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					setSelectedIndex(i => Math.max(i - 1, 0));
				} else if (e.key === 'Enter' || e.key === 'Tab') {
					if (m.length > 0) {
						e.preventDefault();
						insertMatchRef.current(m[selectedIndexRef.current] ?? m[0]);
					}
				} else if (e.key === 'Escape') {
					e.preventDefault();
					setOpen(false);
				}
			}

			function handleBlur() {
				// If a dropdown item is being clicked, the mousedown handler
				// will have set the ref — don't close in that case.
				requestAnimationFrame(() => {
					if (!clickingItemRef.current) {
						setOpen(false);
					}
				});
			}

			ta.addEventListener('input', handleInput);
			ta.addEventListener('keydown', handleKeyDown);
			ta.addEventListener('blur', handleBlur);

			return () => {
				ta.removeEventListener('input', handleInput);
				ta.removeEventListener('keydown', handleKeyDown);
				ta.removeEventListener('blur', handleBlur);
			};
		}, [textareaRef]);

		// Scroll selected item into view.
		React.useEffect(() => {
			if (!listRef.current) return;

			const items = listRef.current.children;

			if (items[selectedIndex]) {
				(items[selectedIndex] as HTMLElement).scrollIntoView({block: 'nearest'});
			}
		}, [selectedIndex]);

		if (!open || matches.length === 0) {
			return null;
		}

		return (
			<div
				className="textarea-link-autocomplete"
				ref={listRef}
				style={{top: position.top, left: position.left}}
			>
				{matches.map((name, i) => (
					<div
						key={name}
						className={`autocomplete-item ${i === selectedIndex ? 'selected' : ''}`}
						onMouseDown={e => {
							e.preventDefault();
							clickingItemRef.current = true;
							insertMatch(name);
							clickingItemRef.current = false;
						}}
					>
						{name}
					</div>
				))}
			</div>
		);
	};
