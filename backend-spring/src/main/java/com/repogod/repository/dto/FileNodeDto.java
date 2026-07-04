package com.repogod.repository.dto;

import java.util.List;

public class FileNodeDto {

    private String name;
    private String path;
    private String type; // "file" or "directory"
    private String language;
    private List<FileNodeDto> children;

    public FileNodeDto() {}

    public FileNodeDto(String name, String path, String type, String language, List<FileNodeDto> children) {
        this.name = name;
        this.path = path;
        this.type = type;
        this.language = language;
        this.children = children;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public List<FileNodeDto> getChildren() { return children; }
    public void setChildren(List<FileNodeDto> children) { this.children = children; }
}
