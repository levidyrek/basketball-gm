const g = require('../globals');
const ui = require('../ui');
const league = require('../core/league');
const ko = require('knockout');
const bbgmView = require('../util/bbgmView');

function get(req) {
    return {
        mid: req.params.mid ? parseInt(req.params.mid, 10) : null,
    };
}

async function updateMessage(inputs, updateEvents, vm) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || vm.message.mid() !== inputs.mid) {
        let message, readThisPageview;
        await g.dbl.tx("messages", "readwrite", async tx => {
            readThisPageview = false;

            // If mid is null, this will open the *unread* message with the highest mid
            await tx.messages.iterate(inputs.mid, 'prev', (messageLocal, shortCircuit) => {
                message = messageLocal;

                if (!message.read) {
                    shortCircuit(); // Keep looking until we find an unread one!

                    message.read = true;
                    readThisPageview = true;

                    return message;
                }
            });
        });

        league.updateLastDbChange();

        if (readThisPageview) {
            if (g.gameOver) {
                ui.updateStatus("You're fired!");
            }

            await ui.updatePlayMenu(null);
        }

        return {
            message,
        };
    }
}

function uiFirst(vm) {
    ko.computed(() => {
        ui.title(`Message From ${vm.message.from()}`);
    }).extend({throttle: 1});
}

module.exports = bbgmView.init({
    id: "message",
    get,
    runBefore: [updateMessage],
    uiFirst,
});
