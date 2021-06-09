import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		enabled: true,
		blacklist: "facebook.com\ntwitter.com",
		difficulty: "easy",
		tangram: true,
		sudoku: false,
		math: false,
		chess: false,
		labyrinth: false,
		embedded: false,
		hintTime: 240,
		solutionTime: 360
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});
