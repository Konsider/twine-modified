import * as React from 'react';

/**
 * Icon showing a card with a title bar and text lines (full content view).
 * Visually represents "Title & Summary" mode.
 */
export const IconViewFull: React.FC<{size?: number}> = ({size = 24}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{/* Card outline */}
		<rect x="3" y="3" width="18" height="18" rx="2" />
		{/* Title line (bold/thick) */}
		<line x1="6" y1="7.5" x2="18" y2="7.5" strokeWidth="2.5" />
		{/* Text lines */}
		<line x1="6" y1="12" x2="16" y2="12" strokeWidth="1.5" opacity="0.5" />
		<line x1="6" y1="15.5" x2="13" y2="15.5" strokeWidth="1.5" opacity="0.5" />
	</svg>
);

/**
 * Icon showing a card with only a centred title (compact view).
 * Visually represents "Title Only" mode.
 */
export const IconViewTitles: React.FC<{size?: number}> = ({size = 24}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{/* Card outline */}
		<rect x="3" y="3" width="18" height="18" rx="2" />
		{/* Centred title line only */}
		<line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5" />
	</svg>
);

/**
 * Icon showing the "auto" concept — a card that transitions between
 * full and compact depending on zoom.  Uses a split design.
 */
export const IconViewAuto: React.FC<{size?: number}> = ({size = 24}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{/* Card outline */}
		<rect x="3" y="3" width="18" height="18" rx="2" />
		{/* "A" letter to suggest Auto */}
		<path d="M9.5 16 L12 7 L14.5 16" strokeWidth="2" />
		<line x1="10.3" y1="13" x2="13.7" y2="13" strokeWidth="1.5" />
	</svg>
);
