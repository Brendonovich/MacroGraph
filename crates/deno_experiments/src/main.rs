use std::path::Path;

use deno_runtime::{
    deno_core::{error::AnyError, ModuleSpecifier},
    deno_napi::v8,
    permissions::PermissionsContainer,
    worker::MainWorker,
};

#[tokio::main]
async fn main() -> Result<(), AnyError> {
    let js_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("main.ts");
    let main_module = ModuleSpecifier::from_file_path(js_path).unwrap();

    let mut worker = MainWorker::bootstrap_from_options(
        main_module.clone(),
        PermissionsContainer::allow_all(),
        Default::default(),
    );

    let module_id = worker.preload_main_module(&main_module).await?;
    worker.evaluate_module(module_id).await?;

    let global = worker.js_runtime.get_module_namespace(module_id).unwrap();
    let scope = &mut worker.js_runtime.handle_scope();

    let key = v8::String::new(scope, "bruh").unwrap().into();
    let value = global.open(scope).get(scope, key).unwrap();
    let func = v8::Local::<v8::Function>::try_from(value).unwrap();

    let recv = v8::Local::new(scope, global).into();
    let result = func.call(scope, recv, &[]).unwrap();
    dbg!(result.int32_value(scope));

    Ok(())
}
