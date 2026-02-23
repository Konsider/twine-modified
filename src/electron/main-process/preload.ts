// Exposes a limited set of Electron modules to a renderer process. Because the
// renderer processes load remote content (e.g. story formats), they must be
// isolated.
//
// For now, we cannot use context isolation here because of jsonp. For jsonp
// loading to work, it expects a global property to be set--but because it
// crosses a context boundary, that global is in the wrong place. For now, we
// place a privileged jsonp function into renderer context.

import {contextBridge, ipcRenderer} from 'electron';
import {Story} from '../../store/stories/stories.types';

contextBridge.exposeInMainWorld('twineElectron', {
	chooseDirectory(defaultPath?: string) {
		return ipcRenderer.invoke('choose-directory', defaultPath);
	},
	deleteStory(story: Story) {
		ipcRenderer.send('delete-story', story);
	},
	loadPrefs() {
		return ipcRenderer.invoke('load-prefs');
	},
	loadStories() {
		return ipcRenderer.invoke('load-stories');
	},
	loadStoryFormats() {
		return ipcRenderer.invoke('load-story-formats');
	},
	onceStoryRenamed(callback: () => void): void {
		ipcRenderer.once('story-renamed', callback);
	},
	openWithScratchFile(data: string, filename: string) {
		ipcRenderer.send('open-with-scratch-file', data, filename);
	},
	renameStory(oldStory: Story, newStory: Story) {
		ipcRenderer.send('rename-story', oldStory, newStory);
	},
	saveJson(filename: string, data: any) {
		ipcRenderer.send('save-json', filename, data);
	},
	saveStoryHtml(story: Story, data: string) {
		ipcRenderer.send('save-story-html', story, data);
	},
	showSaveFileDialog(
		data: string,
		defaultFilename: string,
		defaultPath: string
	) {
		return ipcRenderer.invoke(
			'show-save-file-dialog',
			data,
			defaultFilename,
			defaultPath
		);
	},
	showSaveBinaryDialog(
		data: Uint8Array,
		defaultFilename: string,
		defaultPath: string
	) {
		return ipcRenderer.invoke(
			'show-save-binary-dialog',
			data,
			defaultFilename,
			defaultPath
		);
	},
	loadImageManifest(storyIfid: string) {
		return ipcRenderer.invoke('load-image-manifest', storyIfid);
	},
	savePassageImage(
		storyIfid: string,
		passageName: string,
		imageData: Uint8Array,
		extension: string
	) {
		return ipcRenderer.invoke(
			'save-passage-image',
			storyIfid,
			passageName,
			imageData,
			extension
		);
	},
	deletePassageImage(storyIfid: string, passageName: string) {
		return ipcRenderer.invoke(
			'delete-passage-image',
			storyIfid,
			passageName
		);
	},
	deleteStoryImages(storyIfid: string) {
		return ipcRenderer.invoke('delete-story-images', storyIfid);
	},
	renamePassageImage(
		storyIfid: string,
		oldPassageName: string,
		newPassageName: string
	) {
		return ipcRenderer.invoke(
			'rename-passage-image',
			storyIfid,
			oldPassageName,
			newPassageName
		);
	}
});