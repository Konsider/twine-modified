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
 * Generates a color name for a string, roughly mapping hueString() to colors.
 */
export function colorString(value: string): Color {
	const hue = hueString(value);

	if (hue < 20) {
		return 'red';
	}

	if (hue < 50) {
		return 'orange';
	}

	if (hue < 75) {
		return 'yellow';
	}

	if (hue < 160) {
		return 'green';
	}

	if (hue < 200) {
		return 'teal';
	}

	if (hue < 270) {
		return 'blue';
	}

	if (hue < 310) {
		return 'purple';
	}

	if (hue < 345) {
		return 'pink';
	}

	return 'red';
}