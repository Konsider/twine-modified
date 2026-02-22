// Packages we use but don't have types.

declare module 'segseg' {
	// See https://github.com/tmpvar/segseg/blob/master/index.js

	export type SegSegVector = [number, number];

	export default function (
		out: SegSegVector,
		p1: SegSegVector,
		p2: SegSegVector,
		p3: SegSegVector,
		p4: SegSegVector
	): boolean;
}

declare module 'jszip' {
	interface JSZipFile {
		dir: boolean;
		async(type: 'string'): Promise<string>;
		async(type: 'blob'): Promise<Blob>;
		async(type: 'arraybuffer'): Promise<ArrayBuffer>;
	}

	interface JSZipFiles {
		[key: string]: JSZipFile;
	}

	class JSZip {
		files: JSZipFiles;
		file(name: string, data: string | Blob | ArrayBuffer): this;
		generateAsync(options: {type: 'blob'}): Promise<Blob>;
		static loadAsync(data: File | Blob | ArrayBuffer): Promise<JSZip>;
	}

	export default JSZip;
}