package com.km.admin.review.mapper;

import com.km.admin.review.entity.ReviewRecord;
import com.km.admin.review.vo.ReviewTimelineVO;

import java.util.List;

public interface ReviewRecordMapper {

    ReviewRecord selectById(Long id);

    List<ReviewRecord> selectByDocId(Long docId);

    List<ReviewTimelineVO> selectTimelineByDocId(Long docId);

    ReviewRecord selectLatestByDocId(Long docId);

    int insert(ReviewRecord reviewRecord);
}

