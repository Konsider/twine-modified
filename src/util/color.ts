// See https://stackoverflow.com/a/64174790

export const colors = [
	'none',
	'red',
	'orange',
	'yellow',
	'green',
	'teal',
	'blue',
	'purple',
	'pink',
	'brown',
	'gray'
];

export type Color = typeof colors[number];

/**
 * Generates a hue (as in the HSL colorspace) for a string.
 */
export function hueString(value: string): number {
	let result = 0;

	for (let i = 0; i < value.length; i++) {
		result += value.charCodeAt(i);
	}

	return result % 360;
}

/**
 * Generates a color name for a string, distributing evenly across all
 * named colors (excluding 'none'). Uses a simple hash modulo so that
 * brown and gray are reachable — hue-based mapping can't distinguish
 * them from other warm / desaturated tones.
 */
export function colorString(value: string): Color {
	const namedColors = colors.filter(c => c !== 'none');
	let hash = 0;

	for (let i = 0; i < value.length; i++) {
		hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
	}

	return namedColors[Math.abs(hash) % namedColors.length];
}