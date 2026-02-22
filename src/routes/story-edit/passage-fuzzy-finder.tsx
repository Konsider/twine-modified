import debounce from 'lodash/debounce';
import * as React from 'react';
import {useHotkeys} from 'react-hotkeys-hook';
import {useTranslation} from 'react-i18next';
import {CSSTransition} from 'react-transition-group';
import {FuzzyFinder} from '../../components/fuzzy-finder';
import {
	highlightPassages,
	passagesMatchingFuzzySearch,
	SearchScope,
	selectPassage,
	Story,
	useStoriesContext
} from '../../store/stories';
import {Point} from '../../util/geometry';

const DROPDOWN_LIMIT = 5;
const HIGHLIGHT_LIMIT = 100;

export interface PassageFuzzyFinderProps {
	onClose: () => void;
	onOpen: () => void;
	open?: boolean;
	setCenter: (value: Point) => void;
	story: Story;
}

const ScopeToolbar: React.FC<{
	scope: SearchScope;
	onChange: (scope: SearchScope) => void;
}> = ({scope, onChange}) => {
	const {t} = useTranslation();

	return (
		<div className="search-scope">
			<span className="search-scope-label">
				{t('components.passageFuzzyFinder.searchIn')}
			</span>
			{(['names', 'text', 'both'] as SearchScope[]).map(s => (
				<button
					key={s}
					className={scope === s ? 'active' : ''}
					onClick={() => onChange(s)}
					type="button"
				>
					{t(`components.passageFuzzyFinder.scope.${s}`)}
				</button>
			))}
		</div>
	);
};

export const PassageFuzzyFinder: React.FC<PassageFuzzyFinderProps> = props => {
	const {onClose, onOpen, open, setCenter, story} = props;
	const {dispatch} = useStoriesContext();
	const [search, setSearch] = React.useState('');
	const [debouncedSearch, setDebouncedSearch] = React.useState('');
	const [scope, setScope] = React.useState<SearchScope>('both');
	const updateDebouncedSearch = React.useMemo(
		() =>
			debounce(
				(value: string) => {
					setDebouncedSearch(value);
				},
				100,
				{leading: true, trailing: true}
			),
		[]
	);

	// Get a larger set of matches for map highlighting.
	const allMatches = React.useMemo(
		() => passagesMatchingFuzzySearch(story.passages, debouncedSearch, HIGHLIGHT_LIMIT, scope),
		[debouncedSearch, scope, story.passages]
	);

	// Only show the top results in the dropdown list.
	const dropdownMatches = React.useMemo(
		() => allMatches.slice(0, DROPDOWN_LIMIT),
		[allMatches]
	);

	const results = React.useMemo(
		() =>
			dropdownMatches.map(({name, text}) => ({
				heading: name,
				detail: text
			})),
		[dropdownMatches]
	);

	// Highlight all matching passages on the map.
	const debouncedDispatch = React.useMemo(
		() => debounce(dispatch, 150, {leading: false, trailing: true}),
		[dispatch]
	);

	React.useEffect(() => {
		if (open) {
			debouncedDispatch(highlightPassages(story, allMatches.map(p => p.id)));
		}
	}, [allMatches, debouncedDispatch, open, story]);

	useHotkeys('p', onOpen);
	const {t} = useTranslation();

	const footerText = React.useMemo(() => {
		if (!debouncedSearch || allMatches.length === 0) return undefined;
		return t('components.passageFuzzyFinder.highlightedCount', {
			count: allMatches.length
		});
	}, [allMatches.length, debouncedSearch, t]);

	function handleChangeSearch(value: string) {
		setSearch(value);
		updateDebouncedSearch(value);
	}

	function handleClose() {
		// Clear highlights when closing.
		debouncedDispatch.cancel();
		dispatch(highlightPassages(story, []));
		setSearch('');
		setDebouncedSearch('');
		onClose();
	}

	function handleSelectResult(index: number) {
		setCenter(dropdownMatches[index]);
		dispatch(selectPassage(story, dropdownMatches[index], true));
		// Clear highlights and close.
		dispatch(highlightPassages(story, []));
		setSearch('');
		setDebouncedSearch('');
		onClose();
	}

	return (
		<CSSTransition
			classNames="pop"
			mountOnEnter
			timeout={200}
			unmountOnExit
			in={open}
		>
			<FuzzyFinder
				footerText={footerText}
				noResultsText={t('components.passageFuzzyFinder.noResults')}
				onClose={handleClose}
				onChangeSearch={handleChangeSearch}
				onSelectResult={handleSelectResult}
				prompt={t('components.passageFuzzyFinder.prompt')}
				search={search}
				results={results}
				toolbar={<ScopeToolbar scope={scope} onChange={setScope} />}
			/>
		</CSSTransition>
	);
};
