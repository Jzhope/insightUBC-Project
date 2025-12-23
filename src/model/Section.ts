const OVERALL_SECTION_YEAR = 1900;

export type SectionRaw = {
	Subject: string;
	Course: string;
	Avg: number;
	Professor: string;
	Title: string;
	Pass: number;
	Fail: number;
	Audit: number;
	id: string | number;
	Section: string;
	Year: string | number;
};

export default class Section {
	public dept: string;

	public id: string;

	public avg: number;

	public instructor: string;

	public title: string;

	public pass: number;

	public fail: number;

	public audit: number;

	public uuid: string;

	public year: number;

	constructor(raw: SectionRaw) {
		this.dept = raw.Subject;
		this.id = raw.Course;
		this.avg = raw.Avg;
		this.instructor = raw.Professor;
		this.title = raw.Title;
		this.pass = raw.Pass;
		this.fail = raw.Fail;
		this.audit = raw.Audit;
		this.uuid = String(raw.id);
		this.year = raw.Section === "overall" ? OVERALL_SECTION_YEAR : Number(raw.Year);
	}
}
