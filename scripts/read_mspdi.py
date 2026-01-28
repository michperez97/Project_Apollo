#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET


NS = {"p": "http://schemas.microsoft.com/project"}


def get_text(node, tag):
    elem = node.find(f"p:{tag}", NS)
    return elem.text.strip() if elem is not None and elem.text else ""


def is_summary(task):
    # MSPDI sometimes includes a project summary task (UID/ID 0).
    uid = get_text(task, "UID")
    tid = get_text(task, "ID")
    name = get_text(task, "Name").lower()
    return uid == "0" or tid == "0" or name == "project summary"


def read_tasks(path):
    tree = ET.parse(path)
    root = tree.getroot()
    tasks_parent = root.find("p:Tasks", NS)
    if tasks_parent is None:
        return []
    tasks = []
    for task in tasks_parent.findall("p:Task", NS):
        if is_summary(task):
            continue
        tasks.append(
            {
                "uid": get_text(task, "UID"),
                "id": get_text(task, "ID"),
                "name": get_text(task, "Name"),
                "start": get_text(task, "Start"),
                "finish": get_text(task, "Finish"),
                "duration": get_text(task, "Duration"),
                "milestone": get_text(task, "Milestone"),
                "notes": get_text(task, "Notes"),
            }
        )
    return tasks


def main():
    if len(sys.argv) < 2:
        print("Usage: read_mspdi.py <mspdi-xml-file>", file=sys.stderr)
        sys.exit(2)

    path = sys.argv[1]
    tasks = read_tasks(path)
    if not tasks:
        print("No tasks found.")
        return

    for t in tasks:
        milestone = " (milestone)" if t["milestone"] == "1" else ""
        print(f'{t["id"]}. {t["name"]}{milestone}')
        print(f'   start: {t["start"]}')
        print(f'   finish: {t["finish"]}')
        print(f'   duration: {t["duration"]}')
        if t["notes"]:
            print(f'   notes: {t["notes"]}')


if __name__ == "__main__":
    main()
