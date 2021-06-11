import OptionsSync from 'webext-options-sync';

export default new OptionsSync({
	defaults: {
		enabled: true,
		blacklist: "facebook.com\ntwitter.com",
		difficulty: "easy",
		embedded: false,
		hintTime: 0,
		solutionTime: 0
	},
	migrations: [
		OptionsSync.migrations.removeUnused
	],
	logging: true
});

/*
tangram: true,
sudoku: false,
math: false,
chess: false,
labyrinth: false,*/
