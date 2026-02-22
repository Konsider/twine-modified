import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {RouteToolbar} from '../../../components/route-toolbar';
import {AppActions, BuildActions} from '../../../route-actions';
import {Story} from '../../../store/stories';
import {PassageDisplayMode} from '../../../components/passage/passage-map';
import {Point} from '../../../util/geometry';
import {PassageActions} from './passage/passage-actions';
import {StoryActions} from './story/story-actions';
import {UndoRedoButtons} from './undo-redo-buttons';
import {ZoomButtons} from './zoom-buttons';

export interface StoryEditToolbarProps {
	getCenter: () => Point;
	mainContent: React.RefObject<HTMLElement>;
	onOpenFuzzyFinder: () => void;
	orphanIds?: Set<string>;
	story: Story;
	displayMode: PassageDisplayMode;
	onChangeDisplayMode: (mode: PassageDisplayMode) => void;
}

export const StoryEditToolbar: React.FC<StoryEditToolbarProps> = props => {
	const {getCenter, mainContent, onOpenFuzzyFinder, orphanIds, story, displayMode, onChangeDisplayMode} = props;
	const {t} = useTranslation();

	return (
		<RouteToolbar
			pinnedControls={
				<>
					<ZoomButtons
						story={story}
						mainContent={mainContent}
						displayMode={displayMode}
						onChangeDisplayMode={onChangeDisplayMode}
						orphanIds={orphanIds}
					/>
					<UndoRedoButtons />
				</>
			}
			tabs={{
				[t('common.passage')]: (
					<PassageActions
						getCenter={getCenter}
						onOpenFuzzyFinder={onOpenFuzzyFinder}
						story={story}
					/>
				),
				[t('common.story')]: <StoryActions story={story} />,
				[t('common.build')]: <BuildActions story={story} />,
				[t('common.appName')]: <AppActions />
			}}
		/>
	);
};
