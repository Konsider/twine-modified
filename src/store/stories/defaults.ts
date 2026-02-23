import {i18n} from '../../util/i18n';
import {Passage, Story} from './stories.types';

export const passageDefaults = (): Omit<Passage, 'id' | 'story'> => ({
	end: false,
	height: 100,
	hub: false,
	highlighted: false,
	left: 0,
	name: 'Start',
	selected: false,
	tags: [],
	text: '',
	top: 0,
	width: 100
});

export const storyDefaults = (): Omit<Story, 'id'> => ({
	ifid: '',
	lastUpdate: new Date(),
	passages: [],
	name: i18n.t('store.storyDefaults.name'),
	script: '',
	selected: false,
	snapToGrid: true,
	startPassage: '',
	storyFormat: '',
	storyFormatVersion: '',
	stylesheet: '',
	tags: [],
	tagColors: {},
	zoom: 1,
	mapScrollLeft: 0,
	mapScrollTop: 0
});
