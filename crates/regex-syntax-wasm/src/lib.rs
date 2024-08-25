use regex_syntax::{
    hir::{Hir, HirKind},
    parse,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_capture_groups(regex: &str) -> Result<CaptureScope, String> {
    Ok(collect_captures(
        &parse(regex).map_err(|err| err.to_string())?,
        false,
    ))
}

fn collect_captures(hir: &Hir, optional: bool) -> CaptureScope {
    match hir.kind() {
        HirKind::Empty | HirKind::Literal(_) | HirKind::Class(_) | HirKind::Look(_) => {
            CaptureScopeInner::Scope(vec![]).into()
        }
        HirKind::Repetition(r) => collect_captures(&r.sub, r.min == 0),
        HirKind::Capture(c) => {
            let mut result = Vec::<CaptureScope>::new();
            if let Some(name) = c.name.clone() {
                result.push(CaptureScopeInner::Capture(CaptureGroup { name, optional }).into());
            }

            match collect_captures(&c.sub, optional).0 {
                CaptureScopeInner::Scope(sub_captures) if sub_captures.len() == 0 => {}
                r => result.push(r.into()),
            }

            match &result[..] {
                [c] => c.clone().into(),
                _ => CaptureScopeInner::Scope(result).into(),
            }
        }
        HirKind::Concat(c) => {
            let mut captures = vec![];
            for sub in c.iter() {
                match collect_captures(sub, optional).0 {
                    CaptureScopeInner::Scope(sub_captures) => {
                        captures.extend(sub_captures);
                    }
                    CaptureScopeInner::Capture(capture) => {
                        captures.push(CaptureScopeInner::Capture(capture).into());
                    }
                }
            }

            match captures.first() {
                Some(capture) if captures.len() == 1 => capture.clone(),
                _ => CaptureScopeInner::Scope(captures).into(),
            }
        }
        HirKind::Alternation(c) => CaptureScopeInner::Scope(
            c.iter()
                .filter_map(|sub| match collect_captures(sub, true).0 {
                    CaptureScopeInner::Scope(sub_captures) if sub_captures.len() == 0 => None,
                    r => Some(CaptureScope(r)),
                })
                .collect(),
        )
        .into(),
    }
}

#[derive(Debug, Clone)]
pub enum CaptureScopeInner {
    Scope(Vec<CaptureScope>),
    Capture(CaptureGroup),
}

impl Into<CaptureScope> for CaptureScopeInner {
    fn into(self) -> CaptureScope {
        CaptureScope(self)
    }
}

// Bindgen only supports C-style enums :(
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct CaptureScope(CaptureScopeInner);

#[wasm_bindgen]
impl CaptureScope {
    pub fn scope(&self) -> Vec<CaptureScope> {
        match &self.0 {
            CaptureScopeInner::Scope(scope) => scope.clone(),
            _ => vec![],
        }
    }

    pub fn capture(&self) -> Option<CaptureGroup> {
        match &self.0 {
            CaptureScopeInner::Capture(capture) => Some(capture.clone()),
            _ => None,
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct CaptureGroup {
    name: Box<str>,
    optional: bool,
}

#[wasm_bindgen]
impl CaptureGroup {
    pub fn name(&self) -> String {
        self.name.to_string()
    }

    pub fn optional(&self) -> bool {
        self.optional
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regex_parsing() {
        assert_eq!(
            format!(
                "{:?}",
                collect_captures(&parse(r#"/abc(?<bruh>\w+)/g"#).unwrap(), false)
            ),
            r#"CaptureScope(Capture(CaptureGroup { name: "bruh", optional: false }))"#
        );

        assert_eq!(
            format!(
                "{:?}",
                collect_captures(
                    &parse(r#"/(?<capture>(?<capture2>[^.-])+)/g"#).unwrap(),
                    false
                )
            ),
            r#"CaptureScope(Scope([CaptureScope(Capture(CaptureGroup { name: "capture", optional: false })), CaptureScope(Capture(CaptureGroup { name: "capture2", optional: false }))]))"#
        );

        assert_eq!(
            format!(
                "{:?}",
                collect_captures(&parse(r#"/(?<name>\w)|(?<name2>\w)/g"#).unwrap(), false)
            ),
            r#"CaptureScope(Scope([CaptureScope(Capture(CaptureGroup { name: "name", optional: true })), CaptureScope(Capture(CaptureGroup { name: "name2", optional: true }))]))"#
        );

        assert_eq!(
            format!(
                "{:?}",
                collect_captures(
                    &parse(r#"/((?<name>\w)|(?<name2>\w))|((?<name3>\w)|(?<name4>\w))/g"#).unwrap(),
                    false
                )
            ),
            r#"CaptureScope(Scope([CaptureScope(Scope([CaptureScope(Capture(CaptureGroup { name: "name", optional: true })), CaptureScope(Capture(CaptureGroup { name: "name2", optional: true }))])), CaptureScope(Scope([CaptureScope(Capture(CaptureGroup { name: "name3", optional: true })), CaptureScope(Capture(CaptureGroup { name: "name4", optional: true }))]))]))"#
        );

        assert_eq!(
            format!(
                "{:?}",
                collect_captures(&parse(r#"/ABC(?<name2>\w)/g"#).unwrap(), false)
            ),
            r#"CaptureScope(Capture(CaptureGroup { name: "name2", optional: false }))"#
        );
    }
}
