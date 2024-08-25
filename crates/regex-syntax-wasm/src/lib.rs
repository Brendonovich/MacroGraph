use regex_syntax::{
    hir::{Hir, HirKind},
    parse,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_capture_groups(regex: &str) -> Result<Vec<CaptureGroup>, String> {
    let mut captures = Vec::new();
    collect_captures(
        &mut captures,
        &parse(regex).map_err(|err| err.to_string())?,
        false,
    );
    Ok(captures)
}

fn collect_captures(captures: &mut Vec<CaptureGroup>, hir: &Hir, optional: bool) {
    match hir.kind() {
        HirKind::Empty | HirKind::Literal(_) | HirKind::Class(_) | HirKind::Look(_) => {}
        HirKind::Repetition(r) => {
            collect_captures(captures, &r.sub, r.min == 0);
        }
        HirKind::Capture(c) => {
            captures.push(CaptureGroup {
                name: match &c.name {
                    Some(name) => NameOrIndex::Name(name.to_string()),
                    None => NameOrIndex::Index(c.index),
                },
                optional,
            });

            collect_captures(captures, &c.sub, optional);
        }
        HirKind::Concat(c) => {
            for sub in c.iter() {
                collect_captures(captures, sub, true);
            }
        }
        HirKind::Alternation(c) => {
            for sub in c.iter() {
                collect_captures(captures, sub, true);
            }
        }
    }
}

pub enum NameOrIndex {
    Name(String),
    Index(u32),
}

#[wasm_bindgen]
pub struct CaptureGroup {
    name: NameOrIndex,
    optional: bool,
}

#[wasm_bindgen]
impl CaptureGroup {
    pub fn name(&self) -> Option<String> {
        match &self.name {
            NameOrIndex::Name(name) => Some(name.clone()),
            NameOrIndex::Index(_) => None,
        }
    }

    pub fn index(&self) -> Option<u32> {
        match &self.name {
            NameOrIndex::Name(_) => None,
            NameOrIndex::Index(index) => Some(*index),
        }
    }

    pub fn optional(&self) -> bool {
        self.optional
    }
}
