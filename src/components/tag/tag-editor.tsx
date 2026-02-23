import * as React from 'react';
import {useTranslation} from 'react-i18next';
import classNames from 'classnames';
import {IconWriting, IconTrash} from '@tabler/icons';
import {colors, Color} from '../../util/color';
import {PromptButton, PromptValidationResponse} from '../control/prompt-button';
import './tag-editor.css';

export interface TagEditorProps {
	allTags: string[];
	color?: Color;
	name: string;
	onChangeColor: (color: Color) => void;
	onChangeName: (name: string) => void;
	onRemoveAll?: () => void;
	/** Number of passages using this tag. */
	usageCount?: number;
}

export const TagEditor: React.FC<TagEditorProps> = props => {
	const {allTags, color, name, onChangeColor, onChangeName, onRemoveAll, usageCount} = props;
	const [newName, setNewName] = React.useState(name);
	const {t} = useTranslation();

	const swatchColors = colors.filter(c => c !== 'none');

	function validate(value: string): PromptValidationResponse {
		if (value !== name && allTags.includes(value)) {
			return {message: t('components.tagEditor.alreadyExists'), valid: false};
		}

		return {valid: true};
	}

	return (
		<div className="tag-editor">
			<div className="tag-editor-top">
				<span className={classNames('tag-name', `color-${props.color}`)}>
					{props.name}
					{typeof usageCount === 'number' && (
						<span className="tag-usage-count">({usageCount})</span>
					)}
				</span>
				<PromptButton
					icon={<IconWriting />}
					label={t('common.rename')}
					onChange={e => setNewName(e.target.value.replace(/\s/g, '-'))}
					onSubmit={() => onChangeName(newName)}
					prompt={t('common.renamePrompt', {name})}
					value={newName}
					validate={validate}
				/>
				{onRemoveAll && (
					<button
						className="tag-remove-all-btn"
						onClick={onRemoveAll}
						type="button"
						title={t('dialogs.passageTags.removeAllTitle', {name})}
					>
						<IconTrash size={14} />
						{t('dialogs.passageTags.removeAll')}
					</button>
				)}
			</div>
			<div className="tag-editor-swatches">
				<button
					className={classNames('tag-editor-swatch', 'swatch-none', {
						active: !color || color === 'none'
					})}
					onClick={() => onChangeColor('none')}
					title={t('colors.none')}
					type="button"
				/>
				{swatchColors.map(c => (
					<button
						key={c}
						className={classNames('tag-editor-swatch', `swatch-${c}`, {
							active: c === color
						})}
						onClick={() => onChangeColor(c)}
						title={t(`colors.${c}`)}
						type="button"
					/>
				))}
			</div>
		</div>
	);
};
