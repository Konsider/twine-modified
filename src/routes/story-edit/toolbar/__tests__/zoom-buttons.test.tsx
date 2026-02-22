import {fireEvent, render, screen} from '@testing-library/react';
import {axe} from 'jest-axe';
import * as React from 'react';
import {useStoriesContext} from '../../../../store/stories';
import {
	FakeStateProvider,
	FakeStateProviderProps,
	fakeStory,
	StoryInspector
} from '../../../../test-util';
import {ZoomButtons} from '../zoom-buttons';

const TestZoomButtons: React.FC = () => {
	const {stories} = useStoriesContext();
	const mainContent = React.useRef<HTMLElement>(null);
	const [displayMode, setDisplayMode] = React.useState<'auto' | 'titles' | 'full'>('auto');

	return (
		<ZoomButtons
			story={stories[0]}
			mainContent={mainContent}
			displayMode={displayMode}
			onChangeDisplayMode={setDisplayMode}
		/>
	);
};

describe('<ZoomButtons>', () => {
	function renderComponent(contexts?: FakeStateProviderProps) {
		return render(
			<FakeStateProvider {...contexts}>
				<TestZoomButtons />
				<StoryInspector />
			</FakeStateProvider>
		);
	}

	it('displays a title & summary button', () => {
		renderComponent();
		expect(screen.getByLabelText('Title & summary')).toBeInTheDocument();
	});

	it('displays a title only button', () => {
		renderComponent();
		expect(screen.getByLabelText('Title only')).toBeInTheDocument();
	});

	it('displays an auto button', () => {
		renderComponent();
		expect(screen.getByLabelText('Auto (zoom-based)')).toBeInTheDocument();
	});

	it('presses the auto button by default', () => {
		renderComponent();
		expect(
			screen.getByLabelText('Auto (zoom-based)')
		).toHaveAttribute('aria-pressed', 'true');
	});

	it('switches to title only when clicked', () => {
		renderComponent();
		fireEvent.click(screen.getByLabelText('Title only'));
		expect(
			screen.getByLabelText('Title only')
		).toHaveAttribute('aria-pressed', 'true');
		expect(
			screen.getByLabelText('Auto (zoom-based)')
		).toHaveAttribute('aria-pressed', 'false');
	});

	it('is accessible', async () => {
		const {container} = renderComponent();
		expect(await axe(container)).toHaveNoViolations();
	});
});
