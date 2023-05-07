import { core } from "../models";
import { types } from "../types";


const pkg = core.createPackage({
    name: "Localstorage",
});

pkg.createNonEventSchema({
    name: "Set Data",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "key",
            name: "Key",
            type: types.string(),
        });
        t.dataInput({
            id: "value",
            name: "Value",
            type: types.string(),
        });
    },
    run({ ctx }) {
        let key = "value-" + ctx.getInput("key");
        localStorage.setItem(key, ctx.getInput("value"));
    }
})

pkg.createNonEventSchema({
    name: "Get Data",
    variant: "Pure",
    generateIO: (t) => {
        t.dataInput({
            id: "key",
            name: "Key",
            type: types.string(),
        });
        t.dataInput({
            id: "value",
            name: "Value",
            type: types.string(),
        });
        t.dataInput({
            id: "exist",
            name: "Exist",
            type: types.bool(),
        });
        t.dataInput({
            id: "output",
            name: "Data",
            type: types.string(),
        });
    },
    run({ ctx }) {
        let key = "value-" + ctx.getInput("key");
        let data = localStorage.getItem(key);
        ctx.setOutput("exist", data === null);
        if (data !== null) ctx.setOutput("output", data);
    }
})
