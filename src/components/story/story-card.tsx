import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {Story} from '../../store/stories';
import {Color} from '../../util/color';
import {parseLinks} from '../../util/parse-links';
import {CardContent, CardProps} from '../container/card';
import {SelectableCard} from '../container/card/selectable-card';
import {TagButton} from '../tag';
import './story-card.css';
import {StoryPreview} from './story-preview';

const dateFormatter = new Intl.DateTimeFormat([]);

export interface StoryCardProps extends CardProps {
	onChangeTagColor: (name: string, color: Color) => void;
	onRemoveTag: (name: string) => void;
	onEdit: () => void;
	onSelect: () => void;
	story: Story;
	storyTagColors: Record<string, Color>;
}

export const StoryCard: React.FC<StoryCardProps> = props => {
	const {
		onChangeTagColor,
		onEdit,
		onRemoveTag,
		onSelect,
		story,
		storyTagColors,
		...otherProps
	} = props;
	const {t} = useTranslation();

	const unconfirmedEndingCount = React.useMemo(
		() =>
			story.passages.filter(
				p => !p.end && p.text.trim() !== '' && parseLinks(p.text, true).length === 0
			).length,
		[story.passages]
	);

	return (
		<div className="story-card">
			<SelectableCard
				{...otherProps}
				label={story.name}
				onDoubleClick={onEdit}
				onSelect={onSelect}
				selected={story.selected}
			>
				<CardContent>
					<div className="story-card-summary">
						<div className="story-card-summary-preview">
							<StoryPreview story={story} />
						</div>
						<div className="story-card-summary-text">
							<h2>{story.name}</h2>
							<p>
								{t('components.storyCard.lastUpdated', {
									date: dateFormatter.format(story.lastUpdate)
								})}
								<br />
								{t('components.storyCard.passageCount', {
									count: story.passages.length
								})}
								<br />
								{t('components.storyCard.endingCount', {
									count: story.passages.filter(p => p.end).length
								})}
								<br />
								{t('components.storyCard.hubCount', {
									count: story.passages.filter(p => p.hub).length
								})}
								<br />
								{t('components.storyCard.unconfirmedEndingCount', {
									count: unconfirmedEndingCount
								})}
							</p>
						</div>
					</div>
					{story.tags && (
						<div className="tags">
							{story.tags.map(tag => (
								<TagButton
									color={storyTagColors[tag]}
									key={tag}
									name={tag}
									onChangeColor={color => onChangeTagColor(tag, color)}
									onRemove={() => onRemoveTag(tag)}
								/>
							))}
						</div>
					)}
				</CardContent>
			</SelectableCard>
		</div>
	);
};
