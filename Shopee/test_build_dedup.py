# Run: python test_build_dedup.py  (from the Shopee folder). Checks D-S1..S3 helpers.
import importlib.util, os
h = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location("b", os.path.join(h, "build_shopee_upload.py"))
b = importlib.util.module_from_spec(sp); sp.loader.exec_module(b)
M = b.MP
def row(pid, name="Foo (RESTOCK-01)", pub="P", orig="1,000", cond="A", flags="", mp="500"):
    return {"Product ID": pid, "Item name": name, "Publisher": pub, "Original": orig, "Condition": cond,
            "Copy Flags": flags, "Status": "Instock", M: mp}
keep, held = b.dedup([row("1"), row("2", name="Foo (RESTOCK-02)", mp="450")])
assert [k["Product ID"] for k in keep] == ["2"] and len(held) == 1, "identical copies -> 1 row (cheapest)"
keep, _ = b.dedup([row("1"), row("2", cond="B")]);            assert len(keep) == 2, "other condition kept"
keep, _ = b.dedup([row("1"), row("2", flags="MAP")]);         assert len(keep) == 2, "other Copy Flags kept"
keep, _ = b.dedup([row("1"), row("2", orig="1000")]);         assert len(keep) == 1, "Original digits only"
keep, _ = b.dedup([row("1"), row("2", pub="p")]);             assert len(keep) == 1, "publisher case-insensitive"
m = b.pub_grade_options([row("1"), row("2", cond="B")])
assert len({l for _, l in m}) == 2 and b.ok_group(m), "same title, other condition -> distinct options"
assert not b.ok_group(b.pub_grade_options([row("1", mp="100"), row("2", cond="B", mp="600")])), ">5x price -> not grouped"
print("OK")
