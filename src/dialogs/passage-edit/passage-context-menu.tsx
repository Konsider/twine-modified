import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {useTranslation} from 'react-i18next';
import './passage-context-menu.css';

export interface PassageContextMenuProps {
	x: number;
	y: number;
	hasSelection: boolean;
	onCut: () => void;
	onCopy: () => void;
	onPaste: () => void;
	onMakeLink: () => void;
	onClose: () => void;
}

export const PassageContextMenu: React.FC<PassageContextMenuProps> = props => {
	const {x, y, hasSelection, onCut, onCopy, onPaste, onMakeLink, onClose} =
		props;
	const menuRef = React.useRef<HTMLDivElement>(null);
	const [position, setPosition] = React.useState<{left: number; top: number}>({
		left: x,
		top: y
	});
	const {t} = useTranslation();

	// After mount, measure the menu and clamp within viewport.
	React.useLayoutEffect(() => {
		const menu = menuRef.current;

		if (!menu) {
			return;
		}

		const rect = menu.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const pad = 8;

		let left = x;
		let top = y;

		if (left + rect.width + pad > vw) {
			left = Math.max(pad, x - rect.width);
		}

		if (top + rect.height + pad > vh) {
			top = Math.max(pad, y - rect.height);
		}

		left = Math.max(pad, Math.min(left, vw - rect.width - pad));
		top = Math.max(pad, Math.min(top, vh - rect.height - pad));

		setPosition({left, top});
	}, [x, y]);

	// Close when clicking outside or pressing Escape.
	React.useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		const timer = window.setTimeout(() => {
			document.addEventListener('mousedown', handleClick);
			document.addEventListener('keydown', handleKeyDown);
		}, 0);

		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('mousedown', handleClick);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	// Render via a portal to document.body so that parent CSS transforms
	// don't break `position: fixed` positioning.
	return ReactDOM.createPortal(
		<div
			className="passage-context-menu"
			ref={menuRef}
			style={{left: position.left, top: position.top}}
			onContextMenu={e => e.preventDefault()}
		>
			<button
				className="passage-context-menu-item"
				disabled={!hasSelection}
				onClick={() => {
					onCut();
					onClose();
				}}
			>
				{t('dialogs.passageEdit.contextMenu.cut')}
				<span className="shortcut">Ctrl+X</span>
			</button>
			<button
				className="passage-context-menu-item"
				disabled={!hasSelection}
				onClick={() => {
					onCopy();
					onClose();
				}}
			>
				{t('dialogs.passageEdit.contextMenu.copy')}
				<span className="shortcut">Ctrl+C</span>
			</button>
			<button
				className="passage-context-menu-item"
				onClick={() => {
					onPaste();
					onClose();
				}}
			>
				{t('dialogs.passageEdit.contextMenu.paste')}
				<span className="shortcut">Ctrl+V</span>
			</button>
			<div className="passage-context-menu-separator" />
			<button
				className="passage-context-menu-item"
				disabled={!hasSelection}
				onClick={() => {
					onMakeLink();
					onClose();
				}}
			>
				{t('dialogs.passageEdit.contextMenu.makeLink')}
			</button>
		</div>,
		document.body
	);
};
