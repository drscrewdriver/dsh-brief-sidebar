//#region src/index.ts
/**
* Node half of the todo sidebar plugin.
*
* The Cordis loader needs an entry point for the profile row; every behaviour
* of this plugin lives in the browser half, which `dsh-client-modules` serves
* from `./client`. This half therefore installs nothing and owns no state — no
* service, no HTTP route, no tool. In particular it must never touch the
* filesystem at load time: a profile row is instantiated on the boot path, and
* a synchronous read there would delay the host's startup.
*/
/** Profile row identity. */
const name = "dsh-todo-sidebar";
/**
* Node-face apply. Intentionally empty: reading the `todos` projection and
* shadowing the composer-band dock are both browser-side concerns.
*/
function apply() {}
//#endregion
export { apply, name };

//# sourceMappingURL=index.mjs.map