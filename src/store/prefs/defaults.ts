import {PrefsState} from './prefs.types';

export const defaults = (): PrefsState => ({
	appTheme: 'system',
	codeEditorFontFamily: 'var(--font-monospaced)',
	codeEditorFontScale: 1,
	defaultSaveDirectory: '',
	dialogWidth: 600,
	disabledStoryFormatEditorExtensions: [],
	donateShown: false,
	editorCursorBlinks: true,
	firstRunTime: new Date().getTime(),
	lastUpdateSeen: '',
	lastUpdateCheckTime: new Date().getTime(),
	locale:
		(window.navigator as any).userLanguage ||
		window.navigator.language ||
		(window.navigator as any).browserLanguage ||
		(window.navigator as any).systemLanguage ||
		'en-us',
	passageEditorFontFamily: 'var(--font-system)',
	passageEditorFontScale: 1,
	proofingFormat: {
		name: 'Paperthin',
		version: '1.0.0'
	},
	storyFormat: {
		name: 'SugarCube',
		version: '2.37.3'
	},
	storyFormatListFilter: 'current',
	storyListSort: 'date',
	storyListTagFilter: [],
	storyTagColors: {},
	useCodeMirror: true,
	spellCheckInPassageEditor: false,
	welcomeSeen: false,
	customMigrationVersion: 1
});
