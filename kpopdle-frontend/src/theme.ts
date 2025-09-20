import { extendTheme } from "@chakra-ui/react";

const globalTheme = extendTheme({

    styles: {
        global: {
            body: {
                minHeight: "100vh",
                width: "100%",
                background: "linear-gradient(180deg, rgb(253, 209, 218) 0%, rgba(160, 72, 123, 0.8) 100%)",
                fontFamily: `"DynaPuff", system-ui`,
            },
        },
    },
});

export default globalTheme;