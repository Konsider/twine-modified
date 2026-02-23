import * as React from 'react';
import classNames from 'classnames';
import {useTranslation} from 'react-i18next';
import {IconX} from '@tabler/icons';
import {colors, Color} from '../../util/color';
import './tag-button.css';

export interface TagButtonProps {
	color?: Color;
	disabled?: boolean;
	name: string;
	onChangeColor: (color: Color) => void;
	onRemove: () => void;
	/** Start with swatches expanded (e.g. for newly created tags). */
	defaultExpanded?: boolean;
}

export const TagButton: React.FC<TagButtonProps> = props => {
	const {t} = useTranslation();
	const [expanded, setExpanded] = React.useState(props.defaultExpanded ?? false);

	const swatchColors = colors.filter(c => c !== 'none');

	return (
		<div className={classNames('tag-button', `color-${props.color}`)}>
			<div className="tag-button-row">
				<button
					className="tag-button-label"
					disabled={props.disabled}
					onClick={() => setExpanded(!expanded)}
					type="button"
					title={t('components.tagCardButton.clickToPickColor')}
				>
					{props.name}
				</button>
				<button
					className="tag-remove-btn"
					onClick={props.onRemove}
					type="button"
					title={t('common.remove')}
				>
					<IconX size={12} />
				</button>
			</div>
			{expanded && (
				<div className="tag-swatch-row">
					<button
						className={classNames('tag-swatch', 'swatch-none', {
							active: !props.color || props.color === 'none'
						})}
						onClick={() => {
							props.onChangeColor('none');
							setExpanded(false);
						}}
						title={t('colors.none')}
						type="button"
					/>
					{swatchColors.map(color => (
						<button
							key={color}
							className={classNames('tag-swatch', `swatch-${color}`, {
								active: color === props.color
							})}
							onClick={() => {
								props.onChangeColor(color);
								setExpanded(false);
							}}
							title={t(`colors.${color}`)}
							type="button"
						/>
					))}
				</div>
			)}
		</div>
	);
};
