import * as React from 'react';
import {Passage, Story, updatePassage} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {TwineElectronWindow} from '../../electron/shared';
import './passage-image-panel.css';

export interface PassageImagePanelProps {
	passage: Passage;
	story: Story;
}

const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

function getExtension(filename: string): string {
	const parts = filename.split('.');
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'png';
}

function isImageFile(file: File): boolean {
	return (
		file.type.startsWith('image/') ||
		imageExtensions.includes(getExtension(file.name))
	);
}

export const PassageImagePanel: React.FC<PassageImagePanelProps> = props => {
	const {passage, story} = props;
	const {dispatch} = useUndoableStoriesContext();
	const [dragOver, setDragOver] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [lightboxOpen, setLightboxOpen] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const imageUrl = React.useMemo(() => {
		if (passage.image) {
			return `twine-image://${story.ifid}/${encodeURIComponent(passage.image)}`;
		}
		return undefined;
	}, [passage.image, story.ifid]);

	const handleFile = React.useCallback(
		async (file: File) => {
			if (!isImageFile(file)) {
				return;
			}

			const {twineElectron} = window as TwineElectronWindow;

			if (!twineElectron) {
				return;
			}

			setSaving(true);

			try {
				const arrayBuffer = await file.arrayBuffer();
				const imageData = new Uint8Array(arrayBuffer);
				const extension = getExtension(file.name);

				const filename = await twineElectron.savePassageImage(
					story.ifid,
					passage.name,
					imageData,
					extension
				);

				if (filename) {
					dispatch(updatePassage(story, passage, {image: filename}));
				}
			} catch (error) {
				console.error('Failed to save passage image:', error);
			} finally {
				setSaving(false);
			}
		},
		[dispatch, passage, story]
	);

	const handleRemove = React.useCallback(async () => {
		const {twineElectron} = window as TwineElectronWindow;

		if (!twineElectron) {
			return;
		}

		try {
			await twineElectron.deletePassageImage(story.ifid, passage.name);
			dispatch(updatePassage(story, passage, {image: undefined}));
			setLightboxOpen(false);
		} catch (error) {
			console.error('Failed to delete passage image:', error);
		}
	}, [dispatch, passage, story]);

	const handleDragOver = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			setDragOver(true);
		},
		[]
	);

	const handleDragLeave = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			setDragOver(false);
		},
		[]
	);

	const handleDrop = React.useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			event.stopPropagation();
			setDragOver(false);

			const files = event.dataTransfer?.files;

			if (files && files.length > 0) {
				handleFile(files[0]);
			}
		},
		[handleFile]
	);

	const handleBrowse = React.useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileInput = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;

			if (files && files.length > 0) {
				handleFile(files[0]);
			}

			event.target.value = '';
		},
		[handleFile]
	);

	const handleThumbClick = React.useCallback(() => {
		if (imageUrl) {
			setLightboxOpen(true);
		}
	}, [imageUrl]);

	const handleLightboxClose = React.useCallback(
		(event: React.MouseEvent) => {
			if (event.target === event.currentTarget) {
				setLightboxOpen(false);
			}
		},
		[]
	);

	React.useEffect(() => {
		if (!lightboxOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setLightboxOpen(false);
			}
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [lightboxOpen]);

	return (
		<>
			<div
				className={`passage-image-toolbar${dragOver ? ' drag-over' : ''}${
					imageUrl ? ' has-image' : ''
				}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={imageUrl ? handleThumbClick : handleBrowse}
				title={
					imageUrl
						? 'Click to view full size'
						: 'Drop image here or click to browse'
				}
			>
				{saving ? (
					<span className="passage-image-toolbar-saving">…</span>
				) : imageUrl ? (
					<img src={imageUrl} alt="" draggable={false} />
				) : (
					<span className="passage-image-toolbar-placeholder">IMG</span>
				)}
			</div>

			{lightboxOpen && imageUrl && (
				<div className="passage-image-lightbox" onClick={handleLightboxClose}>
					<div className="passage-image-lightbox-content">
						<img src={imageUrl} alt="Passage reference" draggable={false} />
						<div className="passage-image-lightbox-actions">
							<button
								className="passage-image-lightbox-btn"
								onClick={handleBrowse}
								type="button"
							>
								Replace
							</button>
							<button
								className="passage-image-lightbox-btn remove"
								onClick={handleRemove}
								type="button"
							>
								Remove
							</button>
							<button
								className="passage-image-lightbox-btn close"
								onClick={() => setLightboxOpen(false)}
								type="button"
							>
								✕
							</button>
						</div>
					</div>
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				style={{display: 'none'}}
				onChange={handleFileInput}
			/>
		</>
	);
};
